'use client'

import { StyledEngineProvider} from "@mui/material";
import LoginWithPasskey from "./login/page";

export default function Home() {

  return (
    <StyledEngineProvider injectFirst>
      <LoginWithPasskey />
  </StyledEngineProvider>
  );
}
