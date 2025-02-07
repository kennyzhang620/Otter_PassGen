from kencrypt import *

def help():
    print('Generate encryption key with minimum matrix size and condition')
    print('keygen <name> --k <min-size> [min-matrix-cond]')

def main():
    VALUES[4] = False
    try:
        if (len(sys.argv) == 1 or (len(sys.argv) == 2 and (sys.argv[1] == '--h' or sys.argv[1] == '--help'))):
            VALUES[0] = 0
            help()

        if (len(sys.argv) >= 3):
            VALUES[6] = sys.argv[1];
            VALUES[7] = sys.argv[2]

        if (len(sys.argv) == 3):
            if (sys.argv[2] == '--k'):
                generateKey()
                VALUES[0] = 0

        if (len(sys.argv) == 4):
            if (sys.argv[2] == '--k'):
                generateKey(sys.argv[3])
                VALUES[0] = 0


        if (len(sys.argv) == 5):
            if (sys.argv[2] == '--k'):
                generateKey(sys.argv[3], sys.argv[4])
                VALUES[0] = 0

        if (VALUES[0] != None):     
            print("Operation complete!")
        else:
            print("Incorrect operation specified. Showing help menu.")
            help()
    except Exception as e:
        print("Operation failed:", e)

if __name__ == '__main__':
    main()
    
