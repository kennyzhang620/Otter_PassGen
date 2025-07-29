import numpy as np
import random as rp
import sys
import os
import string
import secrets
import pickle
import ntpath

def path_leaf(path):
    head, tail = ntpath.split(path)
    return tail or ntpath.basename(head)

def generateRandStr():
    letters = list(string.ascii_lowercase + string.ascii_uppercase + string.punctuation + string.digits)
    return ''.join(secrets.choice(letters) for i in range(10))

message = ""
VALUES = [None,255, 2**256, generateRandStr(), True, None, '', '']

def IO_String_Hash(strI, max_range):
    hash = 0;
    for i in strI:
        chr = ord(i)
        hash = (hash << 5) - hash + chr;
        hash |= 0; # Convert to 32bit integer
        
    return hash % max_range

def scatter(seed: str):
    r = IO_String_Hash(seed, VALUES[2])
    if len(seed) <= 8:
        print("WARNING: Insufficient passphrase specified. For maximum security, please specify a secure passphrase with at least 10 characters or more.")
    cipher = np.linspace(0, VALUES[1], num=VALUES[1]+1)
    rp.seed(r)
    rp.shuffle(cipher)
    return cipher

def unscatter(seed: str):
    cipher = scatter(seed)
    out = np.linspace(0, VALUES[1], num=VALUES[1]+1)

    for i in range(cipher.shape[0]):
        out[int(cipher[i])] = i
    
    return out

def unscramble(x, cipher):
    return int(cipher[x])
    #res = np.where(cipher==x)[0]
    #return int(res)

def scramble(x, cipher):
    return int(cipher[x])

def unwrap(st, pad=8): #-1
    uw = []
    for a in st:
        uw.append(a)

    VALUES[0] = min(uw)

    sz = len(uw)
    ns = int(np.sqrt(sz) + 1)
    r = int(ns**2 - sz)

    
    if (pad != -1):
        ns = pad
        inc = 0;
        if (sz % ns != 0):
            inc = 1

        r = int(np.floor(sz/ns)) + inc
        r = int(ns*r - len(uw)) 

    for i in range(r):
        uw.append(0)


    CAESAR = scatter(VALUES[3])   
    print("Wrapping...")

    if (VALUES[4] == True):
        for i in range(len(uw)):
            uw[i] = scramble(scramble(scramble(uw[i], CAESAR),CAESAR),CAESAR)
    else:
        uw = list(map(lambda a: scramble(a, CAESAR), uw))
        uw = list(map(lambda a: scramble(a, CAESAR), uw))
        uw = list(map(lambda a: scramble(a, CAESAR), uw))

    if pad == -1:
        return (np.array(uw).reshape(ns,ns),r)
    else:
        return (np.array(uw).reshape(ns,-1),r)


def encrypt(uw, key, unroll):
    if unroll:
        uw = uw.reshape(key.shape[0],-1)

    print("Encrypting...")
    return np.matmul(key, uw)

def decrypt(cipher, key_inv, unroll):
    if unroll:
        cipher = cipher.reshape(key_inv.shape[0],-1)

    print("Decrypting...")
    return np.matmul(key_inv, cipher)

def clamp(x):
    if (x < 0 or x >= 1000):
        return 0

    return x
    
def wrap(mat, offset=0):
    A = mat.reshape(-1,)

    CAESAR = unscatter(VALUES[3])

    if (VALUES[4] == True):
        for i in range(A.shape[0]):
            A[i] = unscramble(unscramble(unscramble(round(A[i]), CAESAR),CAESAR),CAESAR)
        A = list(A.astype(int))
    else:
        A = list(np.round(A).astype(int))
        A = list(map(lambda v: unscramble(v, CAESAR), A))
        A = list(map(lambda v: unscramble(v, CAESAR), A))
        A = list(map(lambda v: unscramble(v, CAESAR), A))

   # unscr = np.vectorize(lambda v: clamp(unscramble(unscramble(unscramble(round(v), CAESAR),CAESAR),CAESAR)))
    print("Unwrapping...")
    return bytes(A[:len(A) - offset])

def key_gen(s, d=-1, condMin = -1):

    if d<= 4:
        raise Exception("Supplied matrix value below 4")

    if d != -1:
        s = d

    R = []
    for x in range(s*s):
        R.append(secrets.choice(range(-100000,100000)))

    R = np.array(R).reshape((s,s)).astype(int)
    print("Generating", R.nbytes*8, "bit key, minimum condition:", condMin);

    while (np.linalg.cond(R) < condMin):
        R = []
        for x in range(s*s):
            R.append(secrets.choice(range(-100000,100000)))
        R = np.array(R).reshape((s,s)).astype(int)

    print("Key generated!")

    return R


def key_inv(mat):
    return np.linalg.inv(mat)

def getSize():
    f = open(VALUES[6], mode="rb")
     
    # Reading file data with read() method
    data = f.read()
    # Printing our byte sequenced data 
    F = data
    VALUES[0] = 0
    print(len(F))


def encryptHeader(header:str, K):
    b = bytearray()
    b.extend(map(ord, header))

    U = unwrap(b, K.shape[0])
    cipher = encrypt(U[0], K, unroll=True)

    return cipher

def decryptHeader(cipher, key):

    pt = decrypt(cipher, key, unroll=True)

    return wrap(pt).decode("utf-8") 


def encryptFile(d=8, cond=500000): #-1
    f = open(VALUES[6], mode="rb")
     
    # Reading file data with read() method
    data = f.read()
    # Printing our byte sequenced data 
    F = data
     
    # Closing the opened file
    f.close()
    K = key_gen(0, d=d,condMin=cond)
    K_inv = key_inv(K)

    print("Packing file contents..")
    U = unwrap(F, K.shape[0])
    cipher = encrypt(U[0], K, unroll=True)

    print("Packing file header and name...")
    header = encryptHeader(path_leaf(VALUES[6]), K)

    dataout = [header, cipher, U[1]]
    fname = os.path.dirname(VALUES[6]) + '/' + (VALUES[5] if VALUES[5] != None else str(secrets.randbelow(2**32)))
    fo = open(VALUES[6], 'wb')
    pickle.dump(dataout, fo)
    fo.close()

    os.rename(VALUES[6], fname)

   # np.save(VALUES[6] + '.cipher.npy', cipher)
    np.save(fname, K_inv)
    os.rename(fname + '.npy', fname + '.KEY')


def decryptFile():
    fname = VALUES[6]
    fi = open(fname, 'rb')

    A = pickle.load(fi) #np.load(VALUES[6], allow_pickle=True)
    B = np.load(VALUES[7], allow_pickle=True)
    fi.close()

    print("Unpacking file header and name...")
    header = decryptHeader(A[0], B)
    print("Unpacking file contents..")
    testd = decrypt(A[1], B, unroll=True)
    R = wrap(testd, A[2])

    f = open(fname,mode="wb")
    f.write(bytes(R))
    f.close()

    os.rename(fname, os.path.dirname(VALUES[6]) + '/' + header.rstrip('\x00'))

def generateKey(d=8, cond=500000): #-1
    K = key_gen(0, d=int(d),condMin=int(cond))
    K_inv = key_inv(K)
    np.save(VALUES[6], K_inv)
    os.rename(VALUES[6] + '.npy', VALUES[6] + '.KEY')

def encryptKey():
    f = open(VALUES[6], mode="rb")
    B = np.load(VALUES[7], allow_pickle=True)
     
    # Reading file data with read() method
    data = f.read()
    # Printing our byte sequenced data 
    F = data
             
    # Closing the opened file
    f.close()

    print("Packing file contents..")
    U = unwrap(F, B.shape[0])
    cipher = encrypt(U[0], np.linalg.inv(B), unroll=True)
    print("Packing file header and name...")
    header = encryptHeader(path_leaf(VALUES[6]), np.linalg.inv(B))

    dataout = [header, cipher, U[1]]
    fname = os.path.dirname(VALUES[6]) + '/' + (VALUES[5] if VALUES[5] != None else str(secrets.randbelow(2**32)))
    fo = open(VALUES[6], 'wb')
    pickle.dump(dataout, fo)
    fo.close()

    os.rename(VALUES[6], fname)


   # np.save(VALUES[6] + '.cipher.npy', cipher)


def generateHashedBytes(bytein: bytes):
    B = np.load(VALUES[7], allow_pickle=True)
     
    # Reading file data with read() method
    # Printing our byte sequenced data 
    F = bytein

    rp.seed(VALUES[3])

    B[rp.choice(range(B.shape[0])), :] = 0
    B[rp.choice(range(B.shape[0])), :] = 0

    U = unwrap(F, B.shape[0])
    cipher = encrypt(U[0], B, unroll=True)

    return bytes(cipher.reshape(-1,1))

def testEncryption():
    msg = '''
ShallowCraft SMP Season 3 is online now

Java version 1.20.1
Bedrock version (idk, but you can also join with bedrock)

Minecraft server details:
Server IP: 51.79.37.5:25600
Dynamic Online Map at: http://51.79.37.5:8179/#world:0:0:0:1500:0:0:0:0:perspective

Main plugins:
bluemap (online map)
gringotts (emerald based currency)
levelled mobs
quickshop (chest shops)
'''
    print("Testing encryption")
        
    s = "ABCDDEFG"
    b = bytearray()
    b.extend(map(ord, s))
    print(wrap(unwrap(b)[0]).decode("utf-8") )

    b = bytearray()
    b.extend(map(ord, msg))
    
    K = key_gen(0, d=10,condMin=500000)
    K_inv = key_inv(K)

    print("E(x)", K)
    print("D(x)", K_inv)
    print("Cond:", np.linalg.cond(K))
    cipher = encryptHeader(msg, K)
    print(msg)
    #print(U)
    #print(cipher)
    #print(cipher.shape)
    #print(wrap(cipher))

    testd = decryptHeader(cipher,K_inv)

    assert msg in testd

    print(testd)