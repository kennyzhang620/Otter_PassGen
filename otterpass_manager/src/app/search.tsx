import * as React from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import { AddCircleOutline } from '@mui/icons-material';


export default function CustomizedInputBase({ searchFunc, appendFunc }: { searchFunc: (searchV: string) => void,  appendFunc: () => void }) {
  return (
    <Paper
      component="form"
      sx={{ p: '2px 4px', display: 'flex', alignItems: 'center'}}
    >
      <Box sx={{ p: '10px' }} aria-label="menu">
        <SearchIcon />
      </Box>
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Search Passwords"
        inputProps={{ 'aria-label': 'search google maps' }}
        onInput={(e) => searchFunc((e.target as HTMLInputElement).value)}
      />
            <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
      <IconButton onClick={appendFunc} color="primary" sx={{ p: '10px' }} aria-label="directions">
        <AddCircleOutline />
      </IconButton>
    </Paper>
  );
}