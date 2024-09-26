import { ExtensionContext, commands, window, env, Uri } from "vscode";
import { URIHandlerCore } from "../URIHandler/URIHandlerCore";
import { InstanceMaster } from "../InstanceConfigManager";
//import fetch, { RequestInit } from 'node-fetch';
import { randomBytes } from "crypto";

export class OAuth {

    constructor() {

    }

    async OAuthAuth(instance:InstanceMaster):Promise<SNOAuthToken> {
        const state = randomBytes(32).toString('hex');
        const config = instance.getConfig();
        const {client_id, client_secret} = config.connection.auth.OAuth;
        //const clientSecret = 'Wh5sJ?fOcD';
        const redirectURI = `${env.uriScheme}://integratenate.snich-canary/oauth`;
        const uri = await env.asExternalUri(Uri.parse(`${config.connection.url}/oauth_auth.do?response_type=code&redirect_uri=${redirectURI}&client_id=${client_id}&state=${state}`));
        await commands.executeCommand('vscode.open', uri);
        let result = await URIHandlerCore.awaitURIResponse();
        console.log('Result: ', result);
        if (!result) {
            throw new Error('Unable to retrieve results');
        }
        const params = new URLSearchParams(result.query);
        console.log(params.get('code'));

        let snOauth = `${config.connection.url}/oauth_token.do`;
        let snOAuthBody = `grant_type=authorization_code&code=${params.get('code')}&redirect_uri=${redirectURI}&client_id=${client_id}&client_secret=${client_secret}`;

        const OAuthToken = await request<SNOAuthToken>(snOauth, { method: "POST", body: snOAuthBody, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        console.log('OAuth token', OAuthToken);
        return OAuthToken;
      
    }
}

declare interface SNOAuthToken {
    access_token: string
    refresh_token: string
    scope: string
    token_type: string
    expires_in: number
}

// Make the `request` function generic
// to specify the return data type:
function request<TResponse>(
    url: string,
    // `RequestInit` is a type for configuring 
    // a `fetch` request. By default, an empty object.
    config: RequestInit = {}

    // This function is async, it will return a Promise:
): Promise<TResponse> {

    // Inside, we call the `fetch` function with 
    // a URL and config given:
    return fetch(url, config)
        // When got a response call a `json` method on it
        .then((response) => response.json())
        // and return the result data.
        .then((data) => data as TResponse);

    // We also can use some post-response
    // data-transformations in the last `then` clause.
}