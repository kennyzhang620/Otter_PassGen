import random
import string
from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_required, login_user, logout_user
from .app import db
from .models import User
from .main import *
import os
bp = Blueprint('auth', __name__)

@bp.route('/t', methods=['GET'])
def test():
    test = "7387483947934"

    user = db.session.scalar(User.select().where(User.username == test))

    authKey[0] = ('0d','06f','x0','0xx')
    
    if (not user):
        user = User(username=test)
        user.password_hash = generate_password_hash(test)
        db.session.add(user)
        db.session.commit()
    else:
      #  flash('User created successfully, you can login now.')
        if len(user.keys) > 0:
            session['user_id'] = user.id
            return redirect(url_for('webauthn.login'))
    login_user(user)
    return redirect(url_for('webauthn.keys'))

@bp.route('/pre-a', methods=["POST"])
def preauth():
    print(request.json)

    A = request.json

    if (not A['hash'] or A['hash'] != stime() or (request.remote_addr != "127.0.0.1" and request.remote_addr != "localhost")) :
        return "FAIL"

    if (A['address'] and A['base']):
        authKey[0] = [A['base'], A['salt'], A['address'], A['num'],A['symbols'], dt.datetime.now().timestamp(), False]
    
    return "SUCCESS"

@bp.route('/auth', methods=['GET'])
def auth():

    if (not authKey[0][5] or authKey[0][5] < (dt.datetime.now().timestamp() - 3) or (request.remote_addr != "127.0.0.1" and request.remote_addr != "localhost")  ):
        authKey[0] = None
        return "FAIL"

    if (os.path.getsize('./app.db') < 1024*1024):
        for x in range(random.randint(6, 24)):
            user = User(username=sha256( (''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(12))).encode('utf-8')).hexdigest())
            user.password_hash = sha256( (''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(12))).encode('utf-8')).hexdigest()
            db.session.add(user)
            randK.append((user.username, user.password_hash))
  
    user = db.session.scalar(User.select().where(User.username == sha256(authKey[0][2].encode('utf-8')).hexdigest()))
    db.session.commit()
    if (not user):
        user = User(username=sha256(authKey[0][2].encode('utf-8')).hexdigest())
        user.password_hash = authKey[0][1]
        db.session.add(user)

        for x in range(random.randint(6, 24)):
            user2 = User(username=sha256( (''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(12))).encode('utf-8')).hexdigest())
            user2.password_hash = sha256( (''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(12))).encode('utf-8')).hexdigest()
            db.session.add(user2)

        db.session.commit()
    else:
        if len(user.keys) > 0:
            session['user_id'] = user.id
            return redirect(url_for('webauthn.login'))
    login_user(user)
    return redirect(url_for('webauthn.keys'))

