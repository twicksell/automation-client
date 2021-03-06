import * as WebSocket from "ws";
import { RequestProcessor } from "../RequestProcessor";

export interface WebSocketRequestProcessor extends RequestProcessor {

    onRegistration(registration: RegistrationConfirmation);

    onConnect(ws: WebSocket);

    onDisconnect();
}

export interface RegistrationConfirmation {

    url: string;
    /**
     * @deprecated use the apiKey from configuration instead
     */
    jwt: string;
    name: string;
    version: string;
}
