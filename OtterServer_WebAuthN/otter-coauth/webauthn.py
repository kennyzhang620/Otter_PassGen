import time
from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    request,
    flash,
    session,
    current_app,
)
from hashlib import sha256
from flask_login import login_required, login_user, current_user
from webauthn import (
    generate_registration_options,
    options_to_json,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    RegistrationCredential,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
    AuthenticationCredential,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes
from .app import db
from .models import load_user, Key
from .main import *

bp = Blueprint('webauthn', __name__)


@bp.route('/keys', methods=['GET'])
@login_required
def keys():
    if (authKey[0] and authKey[0][5]):
        if authKey[0][5] < (dt.datetime.now().timestamp() - 180):
            logout_user()
            authKey[0] = None
            flash('Invalid key verification response')
            return redirect(url_for('main.index'))
    elif not authKey[0]:
        return redirect(url_for('main.index'))

    return render_template('security_keys.html')


@bp.route('/webauthn/register', methods=['GET', 'POST'])
@login_required
def register():
    if (authKey[0] and authKey[0][5]):
        if authKey[0][5] < (dt.datetime.now().timestamp() - 180):
            logout_user()
            authKey[0] = None
            flash('Invalid key verification response')
            return redirect(url_for('main.index'))
    elif not authKey[0]:
        return redirect(url_for('main.index'))

    if request.method == 'GET':
        options = generate_registration_options(
            user_id=str(current_user.id),
            user_name=current_user.username,
            rp_id=current_app.config['WEBAUTHN_RP_ID'],
            rp_name=current_app.config['WEBAUTHN_RP_NAME'],
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.DISCOURAGED,
            ),
            exclude_credentials=[
                PublicKeyCredentialDescriptor(id=base64url_to_bytes(auth.credential_id))
                for auth in current_user.keys
            ],
        )
        count = len(current_user.keys)
        session['challenge'] = options.challenge
        return render_template(
            'webauthn_register.html',
            options=options_to_json(options),
            key_name=f'Security key #{count + 1}',
        )
    else:
        try:
            credential = RegistrationCredential.parse_raw(request.form['credential'])
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=session.pop('challenge'),
                expected_rp_id=current_app.config['WEBAUTHN_RP_ID'],
                expected_origin=current_app.config['WEBAUTHN_RP_ORIGIN'],
                require_user_verification=False,
            )
        except Exception:
            flash('Invalid key registration response')
            return redirect(url_for('webauthn.register'))
        count = len(current_user.keys)

        if (os.path.getsize('./app.db') < 1024*1024):
            for x in randK:
                print(x)
                auth2 = Key(
                      user_id=x[0],
                      name=request.form['name'],
                      credential_id=bytes_to_base64url(bytes(x[1], encoding='utf-8')),
                      public_key=bytes_to_base64url(bytes(sha256(verification.credential_public_key).hexdigest(), encoding='utf-8')),
                      sign_count=verification.sign_count,
                )
                db.session.add(auth2)

        auth = Key(
            user=current_user._get_current_object(),
            name=request.form['name'],
            credential_id=bytes_to_base64url(verification.credential_id),
            public_key=bytes_to_base64url(verification.credential_public_key),
            sign_count=verification.sign_count,
        )

        db.session.add(auth)
        db.session.commit()
        return redirect(url_for('webauthn.keys'))


@bp.route('/webauthn/login', methods=['GET', 'POST'])
def login():
    if (authKey[0] and authKey[0][5]):
        if authKey[0][5] < (dt.datetime.now().timestamp() - 30):
            logout_user()
            authKey[0] = None
            flash('Invalid key verification response')
            return redirect(url_for('main.index'))
    elif not authKey[0]:
        return redirect(url_for('main.index'))

    user = load_user(session.get('user_id'))

    if request.method == 'GET':
        options = generate_authentication_options(
            rp_id='localhost',
            allow_credentials=[
                PublicKeyCredentialDescriptor(id=base64url_to_bytes(auth.credential_id))
                for auth in user.keys
            ],
            user_verification=UserVerificationRequirement.DISCOURAGED,
        )
        session['challenge'] = options.challenge
        return render_template('webauthn_login.html', options=options_to_json(options))
    else:
        session.pop('user_id')
        try:
            credential = AuthenticationCredential.parse_raw(request.form['credential'])
            key = db.session.scalar(
                Key.select().where(Key.credential_id == credential.id)
            )
            if not key or key.user != user:
                flash('Invalid')
                authKey[0] = None
                return redirect(url_for('main.index'))
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=session.pop('challenge'),
                expected_rp_id=current_app.config['WEBAUTHN_RP_ID'],
                expected_origin=current_app.config['WEBAUTHN_RP_ORIGIN'],
                credential_public_key=base64url_to_bytes(key.public_key),
                credential_current_sign_count=key.sign_count,
                require_user_verification=False,
            )
        except Exception:
            flash('Invalid key verification response')
            authKey[0] = None
            return redirect(url_for('main.index'))
        login_user(user)
        authKey[0][1] = user.password_hash
        authKey[0][6] = True
        key.sign_count = verification.new_sign_count
        key.last_used = time.time()
        db.session.commit()
        return redirect(url_for('main.index'))


@bp.route('/webauthn/delete', methods=['POST'])
@login_required
def delete():
    if (authKey[0] and authKey[0][5]):
        if authKey[0][5] < (dt.datetime.now().timestamp() - 180):
            logout_user()
            authKey[0] = None
            flash('Invalid key verification response')
            return redirect(url_for('main.index'))
    elif not authKey[0]:
        return redirect(url_for('main.index'))

    key = db.session.scalar(Key.select().where(Key.id == request.form['id']))
    if not key or key.user != current_user:
        flash('Cannot delete key.')
        return redirect(url_for('webauthn.keys'))
    db.session.delete(key)
    db.session.commit()
    return redirect(url_for('webauthn.keys'))
