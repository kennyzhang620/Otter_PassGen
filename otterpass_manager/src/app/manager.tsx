'use client'

import { StyledEngineProvider, Box, Typography } from "@mui/material";
import BasicTable from "./tableApp";
import CustomizedInputBase from "./search";
import { useEffect, useState } from "react";
import  Sha256  from "../pages/api/algos"

interface PasswordEntry {
  id: number;
  name: string;
  hash: string;
}





let db: IDBDatabase;
const loadedPwd: PasswordEntry[] = [];


function loadAssets(id: number, name: string, hash: string) {
  console.log(loadedPwd, loadedPwd.length)
  if (loadedPwd.length <= id)
    return loadedPwd.push(createData(id, name, hash));
  
  loadedPwd[id] = createData(id, name, hash);
  console.log(loadedPwd)
}


function loadAllData(uid: string, callback: (data: PasswordEntry[]) => void) {
    // Open transaction, get object store, and get() each Asset by name
        const objectStore = db.transaction("Assets_os").objectStore("Assets_os");
        const rs = objectStore.count();

        rs.addEventListener("success", () => {
          for (let i=0;i<rs.result;i++) {
            console.log(i);
            const request = objectStore.get(i);
            request.addEventListener("success", () => {
              // If the result exists in the database (is not undefined)
              if (!request.result)  {

              }
              else {
                if (request.result.u == uid) {
                    loadAssets(
                      request.result.id,
                      request.result.name,
                      request.result.hash,
                    );
                }
              }
          });
        }
        
        callback(loadedPwd)
        });

}








function createData(id: number, name: string, hash: string)
{
  console.log(id, name,hash);
return {id, name, hash} as PasswordEntry;
}

function openDatabase(uid: string, callback: (data: PasswordEntry[]) => void) {
    const request = indexedDB.open("yourDatabaseName", 5); // Replace with your database name

    request.onsuccess = (event) => {
        const target = event.target as IDBOpenDBRequest;
        if (target) {
            db = target.result; // Assign the database instance to db

            loadAllData(uid, callback);
        }
    };

    request.onerror = (event) => {
        console.error("Database error: ", event);
    };

    request.onupgradeneeded = (event) => {
        const target = event.target as IDBOpenDBRequest;
        if (target) {
            db = target.result;

            // Create an objectStore in our database to store notes and an auto-incrementing key
            // An objectStore is similar to a 'table' in a relational database
            const objectStore = db.createObjectStore("Assets_os", {
              keyPath: "id",
              autoIncrement: false,
            });
          
            // Define what data items the objectStore will contain
            objectStore.createIndex("name", "name", { unique: false });
            objectStore.createIndex("hash", "hash", { unique: false });
            objectStore.createIndex("u", "u", { unique: false });
          
            console.log("Database setup complete");
        };
      }
  }

export default function Manager({ uid, hashin }: { uid: string, hashin: string }) {
  const [KeyState, addEntry] = useState<PasswordEntry[]>([]);
  const [searchterm, setSearch] = useState<string>('')
  const [alias, setAlias] = useState<string[]>([]);

  function editEntry(id: number, name: string, hash:string) {
    const updatedState = KeyState.map(item => 
      item.id === id ? { ...item, name, hash } : item
    );
    addEntry(updatedState);
    console.log(updatedState, id, name, hash);
    if (db) save();
  }

  function appendEntry() {
    addEntry([...KeyState, createData(KeyState.length, 'example.com', '')]);
    if (db) save();
  }
  
  function remove(id: number) 
  {
    if (db) remv(id);
    KeyState.splice(id, 1);
    addEntry([...KeyState]);
  }

  function save() {
    console.log("Saving to DB:", KeyState);
    const transaction = db.transaction(["Assets_os"], "readwrite");
    const objectStore = transaction.objectStore("Assets_os");

      // Add all records
      for (const Asset of KeyState) {
        const request = objectStore.put({id: Asset.id, name: Asset.name, hash: Asset.hash, u: uid});  
        request.onsuccess = () => console.log("Saved:", Asset);
        request.onerror = () => console.error("Save error:", request.error);
      }
    
    transaction.oncomplete = () => console.log("Save transaction completed");
    transaction.onerror = () => console.error("Transaction error:", transaction.error);
  }

  function remv(id: number) {
    const objectStore = db
    .transaction(["Assets_os"], "readwrite")
    .objectStore("Assets_os");
    // Add the record to the IDB using add()
      const request = objectStore.delete(id);  
    
      request.addEventListener("success", () =>
        console.log("Record addition attempt finished"),
      );
      request.addEventListener("error", () => console.error(request.error));

  }

  useEffect(() => {
    if (!db) openDatabase(uid, () => addEntry(loadedPwd));

    const fetchAlias = async () => {
      try {
        const response = await fetch('/api/library/alias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ credentialId: Sha256.hash(uid) })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            if (result.data.length > loadedPwd.length) {
              for (let i=loadedPwd.length; i < result.data.length; i++) {
                  loadAssets(i, Sha256.hash(uid + result.data[i] + uid), Sha256.hash(uid + hashin))
              }
            }

            addEntry(loadedPwd);
            setAlias(result.data); // Use the first alias from the array
          }
        }
      } catch (error) {
        console.error('Error fetching alias:', error);
      }
    };

    fetchAlias();

  }, [alias, uid, hashin]);



  return (
    <StyledEngineProvider injectFirst>
    <Box padding={'2rem'}>
      <Typography variant="h4" component="h5">
        Passwords
      </Typography>
      <Box paddingTop={`1em`}>
        <CustomizedInputBase appendFunc={appendEntry} searchFunc={setSearch} />
      </Box>
      <Box paddingTop={`1em`}>
        <BasicTable alias={alias} save={save} uid={uid} data={KeyState.filter(row => alias[row.id].toLowerCase().includes(searchterm ? searchterm : ''))} editFunc={editEntry} rm={remove}/>
      </Box>
    </Box>
  </StyledEngineProvider>
  );
}
