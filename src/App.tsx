import "./App.css";
import { QrCodeScanner, Settings, WifiPassword } from "@mui/icons-material";
import {
  Container,
  createTheme,
  ThemeProvider,
  CssBaseline,
  Box,
  Avatar,
  Typography,
  TextField,
  Stack,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import LoadingButton from "@mui/lab/LoadingButton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { useCallback, useEffect, useState } from "react";

import { WifiWizard2 } from "@awesome-cordova-plugins/wifi-wizard-2";
import { Esptouch } from "capacitor-esptouch";
import { App as CapApp, URLOpenListenerEvent } from "@capacitor/app";
import { Network } from "@capacitor/network";
import {
  BarcodeScanner,
  Barcode,
} from '@capacitor-mlkit/barcode-scanning';

const defaultTheme = createTheme();

const scanSingleBarcode = async (): Promise<Barcode> => {
  return new Promise(async resolve => {
    document.querySelector('body')?.classList.add('barcode-scanner-active');

    const listener = await BarcodeScanner.addListener(
      'barcodeScanned',
      async result => {
        await listener.remove();
        document
          .querySelector('body')
          ?.classList.remove('barcode-scanner-active');
        await BarcodeScanner.stopScan();
        resolve(result.barcode);
      },
    );

    await BarcodeScanner.startScan();
  });
};

function App() {
  const [configuring, setConfiguring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [ssid, setSsid] = useState("");
  const [bssid, setBssid] = useState("");
  const [securityKey, setSecurityKey] = useState("");

  const handleClose = useCallback(() => {
    setSuccess(false);
    setError(false);
  }, [setSuccess, setError]);

  const handleConfigure = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setConfiguring(true);
      const timerId = setTimeout(async () => {
        await Esptouch.stop();
        setConfiguring(false);
        setError(true);
        console.error("Configuration timed out!");
      }, 60000);
      try {
        const ssid = (e.target as any).ssid.value;
        const bssid = (e.target as any).bssid.value;
        const password = (e.target as any).password.value;
        const key = (e.target as any).key.value;
        const group = (e.target as any).group.value;
        await Esptouch.start({
          ssid,
          bssid,
          password,
          aesKey: key,
          customData: group,
        });
        setSuccess(true);
      } catch (e) {
        console.error(e);
        setError(true);
      }
      clearTimeout(timerId);
      setConfiguring(false);
    },
    [setSuccess, setError, setConfiguring]
  );

  useEffect(() => {
    const _doEffect = async () => {
      try {
        const ssid = await WifiWizard2.getConnectedSSID();
        const bssid = await WifiWizard2.getConnectedBSSID();
        setSsid(ssid);
        setBssid(bssid);
        console.log(`Connected to ${ssid} (${bssid})`);
      } catch (e) {
        console.error(e);
      }
    };
    _doEffect();
  }, [setSsid, setBssid]);

  useEffect(() => {
    CapApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      const deepLink = new URL(event.url);
      const key = deepLink.searchParams.get("key");
      if (key) {
        setSecurityKey(key);
      }
    });
    return () => {
      CapApp.removeAllListeners();
    };
  }, [setSecurityKey]);

  useEffect(() => {
    Network.addListener("networkStatusChange", async (status) => {
      console.log("Network status changed", status);
      try {
        const ssid = await WifiWizard2.getConnectedSSID();
        const bssid = await WifiWizard2.getConnectedBSSID();
        setSsid(ssid);
        setBssid(bssid);
        console.log(`Connected to ${ssid} (${bssid})`);
      } catch (e) {
        console.error(e);
      }
    });
    return () => {
      Network.removeAllListeners();
    };
  }, [setSsid, setBssid]);

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Stack direction="row" spacing={2} sx={{ justifyContent: "right", marginTop: (theme) => theme.spacing(2) }}>
          <IconButton onClick={async () => {
            const result = await scanSingleBarcode();
            if (result) {
              const deepLink = new URL(result.rawValue);
              const key = deepLink.searchParams.get("key");
              if (key) {
                setSecurityKey(key);
              }
            }
          }}>
            <QrCodeScanner />
          </IconButton>
        </Stack>
        <Box
          sx={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
            <WifiPassword />
          </Avatar>
          <Typography component="h1" variant="h5">
            Configure WiFi
          </Typography>
          <Box component="form" onSubmit={handleConfigure} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="ssid"
              label="SSID"
              name="ssid"
              disabled
              value={ssid}
            />
            <input type="hidden" name="bssid" value={bssid} id="bssid" />
            <TextField
              margin="normal"
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              autoFocus
              disabled={configuring}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="key"
              label="Security Key"
              type="password"
              id="key"
              autoComplete="security-key"
              InputProps={{ inputProps: { maxLength: 16 } }}
              disabled={configuring}
              value={securityKey}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="group"
              label="Group #"
              id="group"
              autoComplete="group-number"
              InputProps={{ inputProps: { maxLength: 16 } }}
              disabled={configuring}
            />
            <LoadingButton
              loading={configuring}
              type="submit"
              fullWidth
              variant="contained"
              loadingPosition="start"
              sx={{ mt: 3, mb: 2 }}
              startIcon={<Settings />}
            >
              {configuring ? "Configuring..." : "Configure"}
            </LoadingButton>
          </Box>
        </Box>
        <Snackbar
          open={success || error}
          autoHideDuration={6000}
          onClose={handleClose}
        >
          <Alert
            onClose={handleClose}
            severity={success ? "success" : error ? "error" : "info"}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {success && "Configuration successful!"}
            {error && "Configuration failed!"}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default App;
