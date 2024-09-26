import { UriHandler, Uri } from "vscode";

export class URIHandlerCore implements UriHandler {
    static resolve: any;
    static reject: any;
    handleUri(uri: Uri) {
        URIHandlerCore.resolve(uri);
    }

    static async awaitURIResponse(): Promise<Uri> {
        return await new Promise((resolve, reject) => {
            URIHandlerCore.resolve = resolve;
            URIHandlerCore.reject = reject;
        });
    };
}