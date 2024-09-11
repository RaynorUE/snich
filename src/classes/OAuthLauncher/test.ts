import { MyURIHandler } from "./OAuthLauncher";
import { ExtensionContext, commands, env, window, Uri } from "vscode";
import { randomBytes } from "crypto";

export class test {
    constructor() { }

    registerOAuthTest(context:ExtensionContext) {
        const disposable = commands.registerCommand('snich.uri-handler-sample.start', async () => {
            //const blops = await this.context.secrets.get('blops.integratenate');
            //const blops2 = await this.context.secrets.get('blops.2.integratenate');

            const state = randomBytes(32).toString('hex');
            const clientID = '0323ac1d4a2012102e839ea48f231770';
            const clientSecret = 'Wh5sJ?fOcD';
            const redirectURI = `${env.uriScheme}://integratenate.snich-canary`;
            const uri = await env.asExternalUri(Uri.parse(`http://localhost:1600/oauth_auth.do?response_type=code&redirect_uri=${redirectURI}&client_id=${clientID}&state=${state}`));
            await commands.executeCommand('vscode.open', uri);
            let result = await MyURIHandler.awaitURIResponse<Uri>();
            console.log('Result: ', result);
            if (!result) {
                throw new Error('Unable to retrieve results');
            }
            const params = new URLSearchParams(result.query);
            console.log(params.get('code'));

            let snOauth = `http://localhost:1600/oauth_token.do`;
            let snOAuthBody = `grant_type=authorization_code&code=${params.get('code')}&redirect_uri=${redirectURI}&client_id=${clientID}&client_secret=${clientSecret}`;



            let fetchResult = await request<SNOAuthToken>(snOauth, { method: "POST", body: snOAuthBody, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            let fetchData: SNOAuthToken = fetchResult;
            console.log(fetchData);
            const accessToken = fetchData.access_token;

            let dataResult = await request('http://localhost:1600/api/now/table/incident?sysparm_limit=1', {
                method: "GET",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + accessToken }
            })
            await window.showInputBox({ prompt: "Test" });
            console.log('Data Result:', dataResult)
            //window.showInformationMessage(`Starting to handle Uris. Open ${uri} in your browser to test.`);
        });

        context.subscriptions.push(disposable);

    }

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

declare interface SNOAuthToken {
    access_token: string
    refresh_token: string
    scope: string
    token_type: string
    expires_in: number
}