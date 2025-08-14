import * as React from 'react';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import Paper from '@mui/material/Paper';
import Cell from './tableCell';

export default function BasicTable({ alias, data, uid, editFunc, rm, save }: { alias: string[], data: {id: number,  name: string, hash: string }[], uid: string, editFunc: (id: number,  name: string, hash: string) => void, rm: (id: number) => void, save: () => void }) {
  return (
    <TableContainer component={Paper} >
      <Table sx={{ minWidth: 350 }} aria-label="simple table">
        <TableHead>
        </TableHead>
          {data.map((row) => (

            <Cell alias={alias[row.id]} save={save} uid={uid} key={row.id} data={row} edit={editFunc} rm={rm}></Cell>
            
          ))}
      </Table>
    </TableContainer>
  );
}
