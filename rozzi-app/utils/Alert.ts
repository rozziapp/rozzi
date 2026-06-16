import { Alert as RNAlert, AlertButton, AlertOptions } from 'react-native';

export interface CustomAlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
}

type AlertCallback = (config: CustomAlertConfig) => void;

let alertListener: AlertCallback | null = null;
let pendingAlert: CustomAlertConfig | null = null;

export const setAlertListener = (listener: AlertCallback | null) => {
  alertListener = listener;
  if (listener && pendingAlert) {
    listener(pendingAlert);
    pendingAlert = null;
  }
};

// Save original Alert.alert
const originalAlert = RNAlert.alert;

// Override Alert.alert globally
RNAlert.alert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
) => {
  const config: CustomAlertConfig = { title, message, buttons, options };
  if (alertListener) {
    alertListener(config);
  } else {
    // Save as pending and also run native fallback just in case
    pendingAlert = config;
    originalAlert(title, message, buttons, options);
  }
};
