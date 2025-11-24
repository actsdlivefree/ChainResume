import { SDK_CDN_URL } from "./constants";

type TraceType = (message?: unknown, ...optionalParams: unknown[]) => void;

export type FhevmRelayerSDKType = {
  __initialized__?: boolean;
  initSDK: (options?: unknown) => Promise<boolean>;
  createInstance: (config: unknown) => Promise<any>;
  SepoliaConfig: {
    aclContractAddress: `0x${string}`;
  };
};

export type FhevmWindowType = Window & { relayerSDK: FhevmRelayerSDKType };

export class RelayerSDKLoader {
  private _trace?: TraceType;
  constructor(options: { trace?: TraceType }) {
    this._trace = options.trace;
  }
  public isLoaded() {
    if (typeof window === "undefined") {
      throw new Error("RelayerSDKLoader: can only be used in the browser.");
    }
    return isFhevmWindowType(window, this._trace);
  }
  public load(): Promise<void> {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("RelayerSDKLoader: browser only"));
    }
    if ("relayerSDK" in window) {
      if (!isFhevmRelayerSDKType((window as FhevmWindowType).relayerSDK, this._trace)) {
        throw new Error("RelayerSDKLoader: Unable to load FHEVM Relayer SDK");
      }
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SDK_CDN_URL}"]`);
      if (existing) {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(new Error("RelayerSDKLoader: invalid window.relayerSDK"));
        }
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = SDK_CDN_URL;
      script.type = "text/javascript";
      script.async = true;
      script.onload = () => {
        if (!isFhevmWindowType(window, this._trace)) {
          reject(new Error("RelayerSDKLoader: relayerSDK invalid after load"));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        reject(new Error(`RelayerSDKLoader: failed to load ${SDK_CDN_URL}`));
      };
      document.head.appendChild(script);
    });
  }
}

function objHasProperty<T extends object, K extends PropertyKey, V extends string>(
  obj: T,
  propertyName: K,
  propertyType: V,
  trace?: TraceType
): obj is T &
  Record<
    K,
    V extends "string"
      ? string
      : V extends "number"
      ? number
      : V extends "object"
      ? object
      : V extends "boolean"
      ? boolean
      : V extends "function"
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (...args: any[]) => any
      : unknown
  > {
  if (!obj || typeof obj !== "object") return false;
  if (!(propertyName in obj)) {
    trace?.(`RelayerSDKLoader: missing ${String(propertyName)}.`);
    return false;
  }
  const value = (obj as Record<K, unknown>)[propertyName];
  if (value === null || value === undefined) return false;
  if (typeof value !== propertyType) return false;
  return true;
}

export function isFhevmRelayerSDKType(
  o: unknown,
  trace?: TraceType
): o is FhevmRelayerSDKType {
  if (!o || typeof o !== "object") {
    trace?.("RelayerSDKLoader: relayerSDK invalid");
    return false;
  }
  if (!objHasProperty(o, "initSDK", "function", trace)) return false;
  if (!objHasProperty(o, "createInstance", "function", trace)) return false;
  if (!objHasProperty(o, "SepoliaConfig", "object", trace)) return false;
  return true;
}

export function isFhevmWindowType(win: unknown, trace?: TraceType): win is FhevmWindowType {
  if (!win || typeof win !== "object") {
    trace?.("RelayerSDKLoader: window invalid");
    return false;
  }
  if (!("relayerSDK" in (win as any))) {
    trace?.("RelayerSDKLoader: missing relayerSDK");
    return false;
  }
  return isFhevmRelayerSDKType((win as any).relayerSDK, trace);
}


