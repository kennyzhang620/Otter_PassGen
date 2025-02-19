from kencrypt import *
from flask import Flask, request

from hashlib import sha256
import datetime as dt

print(sha256("100001".encode('utf-8')).hexdigest())

def stime():
    ct = int(dt.datetime.now().timestamp() / 3)
    return sha256(str(ct).encode('utf-8')).hexdigest()

def j(p):

    if (p < 0):
        p = 0 

    if p < 33:
        p += 33
        
    if (p > 47 and p < 58):
        return (p + 11) % 123

    if (p > 123):
        return (p % 123) + 33

    return p % 123

def l(p, d=48):

    if (p < 0):
        p = 0 
    if p < d:
        p += d

    if (p > 31 and p < 48):
        return (p + 16) % 123

    if (p > 57 and p < 65):
        return (p + 7) % 123

    if (p > 90 and p < 97):
        return (p + 6) % 123

    if (p > 123):
        return (p % 123) + d

    return p % 123

def v(inp, n: bool, s1: bool):

  #  print(n,s1)

    if (s1 == False and n == True):
        return l(inp)

    if (s1 == True and n == False):
        return j(inp)

    if (not s1 and not n):
    #    print(l(j(inp), 65))
        return l(j(inp), 65)

    if (inp < 33):
        return inp + 33
    return inp

def generateHash(init: str, salt: str, key: str, n, s1):
    res = ""
    try:
        VALUES[6] = init;
        VALUES[7] = key
        VALUES[3] = salt
        s = init
        b = bytearray()
        b.extend(map(ord, s))
        res = ''.join(list(map(chr, list(map(lambda x: v(x % 127, n, s1),list(generateHashedBytes(b)))))))[:14]  
    except Exception as e:
        return "ERROR: " + str(e)
    
    while ("!!!!!!" in res or "0000" in res or "bbbb" in res):
        print(res, VALUES[3])
        VALUES[6] = init;
        VALUES[7] = key
        VALUES[3] += init[len(init) - 1]
        s = init
        b = bytearray()
        b.extend(map(ord, s))
        res = ''.join(list(map(chr, list(map(lambda x: v(x % 127, n, s1),list(generateHashedBytes(b)))))))[:14] 

    return res

app = Flask(__name__)

@app.route('/', methods=['POST'])
def result():
    print(request.json)

    A = request.json

    if (not A['hash'] or A['hash'] != stime() or request.remote_addr != "127.0.0.1"):
        return "FAIL"

    if (A['address'] and A['base'] and A['salt']):
        return generateHash(A['base'], A['salt'], A['address'], A['num'],A['symbols'])
    
    return "HTTP SUCCESS"
if __name__ == '__main__':
    app.run()