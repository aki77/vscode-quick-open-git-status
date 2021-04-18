import { commands, ExtensionContext, Uri, window, workspace } from 'vscode';
import simpleGit, { SimpleGit, FileStatusResult } from 'simple-git';
import { sortStringPropertyDESC } from 'typesafe-utils';

type FileStatusResultWithUri = FileStatusResult & {
  uri: Uri
};

const gitStatus = async (): Promise<ReadonlyArray<FileStatusResultWithUri>> => {
  if (!workspace.workspaceFolders) {
    return [];
  }

  if (workspace.workspaceFolders.length > 1) {
    window.showErrorMessage('Not support multiple workspaceFolders!');
    return [];
  }

  const workspaceFolder = workspace.workspaceFolders[0];
  const git: SimpleGit = simpleGit(workspaceFolder.uri.fsPath);
  const { files } = await git.status();

  return files.map((file) => ({
    ...file,
    uri: Uri.joinPath(workspaceFolder.uri, file.path),
  }));
};

const open = async (): Promise<void> => {
  const items = (await gitStatus())
    .map((file) => {
      const status = file.working_dir === ' ' ? file.index : file.working_dir;
      return {
        label: file.path,
        description: status === '?' ? 'U' : status,
        uri: file.uri,
      };
    })
    .sort(sortStringPropertyDESC('description'));

  const selectedItem = await window.showQuickPick(items, { matchOnDescription: true });
  if (selectedItem) {
    if (selectedItem.description === 'D') {
      commands.executeCommand('workbench.scm.focus');
      return;
    }
    await window.showTextDocument(selectedItem.uri);
  }
};

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand(
    'quick-open-git-status.open',
    open
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
