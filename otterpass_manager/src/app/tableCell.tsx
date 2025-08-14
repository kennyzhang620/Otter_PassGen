import * as React from 'react';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import { useState } from "react";
import {IconButton, Input, Typography } from '@mui/material';
import Checkbox from '@mui/joy/Checkbox';
import {RemoveCircleOutline } from '@mui/icons-material';
import Sha256 from '../pages/api/algos'

export default function Cell({ alias, data, uid, edit, rm, save }: { alias: string, data: { id: number, name: string, hash: string }, uid: string, edit: (id: number, name: string, hash: string) => void, rm: (id: number) => void, save: () => void }) {
  const [clicked, setClick] = useState(false); 
  const [ename, setEname] = useState(data.name);
  const [ehash, setEhash] = useState(data.hash);
  const [_alias, setAlias] = useState(alias);

  const [remv, setRemv] = useState(false);
  const [num, setNum] = useState(true);
  const [sym, setSym] = useState(true);

  const [hout, setCode] = useState("");
  const [show, showPw] = useState(false);
  const url = '/api/library/generator';


/*
    const b1 = tab.url ? tab.url.split('/')[2] : document.getElementById("base").value.split('/')[2]
    const adr = addr || Sha256.hash(document.getElementById("addr").value);
    const data = { "num": document.getElementById("n1").checked, "symbols": document.getElementById("s1").checked, "address": adr, "base": Sha256.hash(adr + b1 + adr), "salt": Sha256.hash(adr + document.getElementById("salt").value), "hash": Sha256.hash(Math.floor(Date.now() / (1000 * 3)).toString()) };

*/

async function genHash(update: boolean) {
    if (hout == "" || update) {
        const b1 = data.name;
        const adr = uid;
        const data2 = { 
          "action": "generatePassword",
          "num": num, 
          "symbols": sym, 
          "address": adr, 
          "base": b1, 
          "salt": data.hash, 
          "hash": Sha256.hash(Math.floor(Date.now() / (1000 * 3)).toString()), 
          "idfd": data.id,
          "ofdm": alias || "",
        };
        console.log(data2);
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data2)
          });
          
          if (response.ok) {
            const responseText = await response.text();
            setCode(responseText);
          } else {
            console.error('Error generating hash:', response.statusText);
          }
        } catch (error) {
          console.error('Error generating hash:', error);
        }


        
    }
  }

  function push(id: number, name: string, hash: string) {
    setClick(false); 
    genHash(true);
    if (!remv)
       edit(data.id, name, hash);
  }


  genHash(false)

  return (
        <TableBody onClick={() => {genHash(true); save()}}>
          {
            clicked ? 
            <TableRow
              key={data.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              onBlur={() => {push(data.id, ename, ehash)}}
            >
              <TableCell component="th" scope="row">
              <Input defaultValue={data.name} onInput={(e) => { setEname(Sha256.hash( uid + (e.target as HTMLInputElement).value + uid )); setAlias((e.target as HTMLInputElement).value) } } />
              </TableCell>
              <TableCell align="right">
              <Input defaultValue={data.hash} onInput={(e) => setEhash(Sha256.hash(uid + (e.target as HTMLInputElement).value))} />
              </TableCell> 
              <TableCell>
                <IconButton onClick={() => {rm(data.id); setRemv(true)}} color="primary" sx={{ p: '10px' }} aria-label="directions">
                <RemoveCircleOutline />
              </IconButton>
              </TableCell>
            </TableRow> : 
            
            <TableRow 
              key={data.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                <Typography onClick={() => setClick(!clicked)} >{_alias ? _alias : data.name.substring(0, 12)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography onClick={() => showPw(!show)}>{hout != "" && show ? hout : "*************"}</Typography>
              </TableCell>
            </TableRow> 
          }

          <TableRow>
            <TableCell>
              <Checkbox defaultChecked label="Include Numbers" onChange={(e) => {setNum(e.target.checked); genHash(true)}} /> 
            </TableCell>
            <TableCell>
              <Checkbox defaultChecked label="Include Symbols" onChange={(e) => {setSym(e.target.checked); genHash(true)}} />
            </TableCell>
          </TableRow>

          
        </TableBody>
  );
}
