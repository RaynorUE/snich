import * as vscode from 'vscode';
import { CommandLauncher } from './CommandLauncher/CommandLauncher';

// https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/src/accounts/oauth/gitlab_authentication_provider.ts

export function activate(context: vscode.ExtensionContext) {

	const cl = new CommandLauncher(context);

	cl.registerCommands();

}