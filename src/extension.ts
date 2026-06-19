import * as vscode from "vscode";

let provider: OpenFilesProvider;

function getOpenFiles() {
  return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
}

async function openFileByIndex(index: number) {
  const tabs = getOpenFiles();

  vscode.window.showInformationMessage(
    `Index=${index}, Total Tabs=${tabs.length}`,
  );

  const tab = tabs[index - 1];

  if (!tab) {
    vscode.window.showWarningMessage(`File ${index} not found`);
    return;
  }

  if (tab.input instanceof vscode.TabInputText) {
    await vscode.commands.executeCommand("vscode.open", tab.input.uri);
  } else {
    vscode.window.showWarningMessage(`Tab ${index} is not a text file`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Open Files");

  vscode.window.showInformationMessage("🚀 File Explorer Loaded");
  output.appendLine("Extension Activated");
  output.show(true);

  provider = new OpenFilesProvider();

  vscode.window.createTreeView("openFilesView", {
    treeDataProvider: provider,
  });

  vscode.window.tabGroups.onDidChangeTabGroups(() => {
    provider.refresh();
  });

  for (let i = 1; i <= 9; i++) {
    const disposable = vscode.commands.registerCommand(
      `file-explorer.openFile${i}`,
      () => openFileByIndex(i),
    );

    context.subscriptions.push(disposable);
  }

  const openByIndex = vscode.commands.registerCommand(
    "file-explorer.openByIndex",
    async () => {
      const value = await vscode.window.showInputBox({
        prompt: "Enter file index",
      });

      if (!value) {
        return;
      }

      const index = Number(value);

      if (isNaN(index)) {
        vscode.window.showErrorMessage("Invalid index");
        return;
      }

      openFileByIndex(index);
    },
  );

  context.subscriptions.push(openByIndex);
  context.subscriptions.push(output);
}

export function deactivate() {}

class OpenFilesProvider implements vscode.TreeDataProvider<OpenFileItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    OpenFileItem | undefined
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: OpenFileItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<OpenFileItem[]> {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);

    const items = tabs.map((tab, index) => {
      let uri: vscode.Uri | undefined;

      if (tab.input instanceof vscode.TabInputText) {
        uri = tab.input.uri;
      }

      return new OpenFileItem(`${index + 1}. ${tab.label}`, uri);
    });

    return Promise.resolve(items);
  }
}

class OpenFileItem extends vscode.TreeItem {
  constructor(label: string, uri?: vscode.Uri) {
    super(label, vscode.TreeItemCollapsibleState.None);

    if (uri) {
      this.resourceUri = uri;

      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [uri],
      };
    }
  }
}
