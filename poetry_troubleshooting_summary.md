# Poetry トラブルシューティングまとめ

このドキュメントは、プロジェクトセットアップ中に発生した Poetry に関する問題とその対応履歴をまとめたものです。

## 1. 事象

プロジェクトの依存関係を管理・更新しようとした際に、以下の問題が発生しました。

*   **Poetry コマンドが認識されない:** PowerShell で `poetry` コマンドを実行しても、「用語 'poetry' は...認識されません」というエラーが発生し、Poetry を利用できない。`python -m poetry` も `No module named poetry` エラーとなる。
*   **依存関係のバージョン解決エラー:** `poetry lock` や `poetry show --outdated` 実行時に、特定のパッケージ (`langgraph-sdk`, `pandas`) の指定されたバージョンが見つからないというエラーが発生する。

## 2. 確認方法

上記の問題を特定・解決するために、以下の確認を行いました。

*   **Poetry インストールの確認:**
    *   公式インストーラーを実行し、「既にインストールされています」というメッセージを確認。
    *   `poetry --version` を実行し、コマンドが認識されないことを確認。
    *   `python -m poetry show --outdated` を実行し、Python からもモジュールが見えないことを確認。
*   **PATH 環境変数の確認:**
    *   PowerShell で `$env:Path` を実行し、Poetry のインストールパスが含まれていないことを確認。
*   **Poetry インストールパスの特定:**
    *   公式インストーラーのメッセージや一般的なインストール場所 (`%APPDATA%\pypoetry\venv\Scripts`, `%APPDATA%\Python\Scripts` など) を確認。
    *   最終的に `%APPDATA%\Python\Scripts` にインストールされていることを突き止めた。
*   **フルパスでの Poetry 実行確認:**
    *   特定したフルパス (`C:\Users\nyham\AppData\Roaming\Python\Scripts\poetry`) を指定して `poetry --version` を実行し、Poetry 自体は正常にインストールされていることを確認。
*   **依存関係解決エラーの確認:**
    *   `poetry show --outdated` (フルパス指定) のエラーメッセージから、問題のあるパッケージ (`langgraph-sdk`, `pandas`) とバージョン指定を特定。
    *   PyPI (https://pypi.org/) で該当パッケージの利用可能なバージョンと Python 互換性を確認。
    *   使用している Python バージョン (`python --version` で確認、この環境では 3.13) と `pyproject.toml` の Python バージョン指定 (`^3.11`) の不一致を確認。
*   **依存関係解決の再試行:**
    *   `pyproject.toml` 修正後、`poetry lock` (フルパス指定) を実行し、依存関係が解決できることを確認。

## 3. 解消方法

発生した問題に対して、以下の対策を実施しました。

*   **Poetry コマンド認識問題:**
    *   **PATH 環境変数への追加:** PowerShell コマンドや Windows の GUI を使用して、正しい Poetry のインストールパス (`%APPDATA%\Python\Scripts`) をユーザー環境変数 `PATH` に追加しようと試みたが、ターミナル再起動後も反映されなかった。
    *   **回避策:** Poetry コマンド実行時に、常にフルパス (`C:\Users\nyham\AppData\Roaming\Python\Scripts\poetry`) を指定することで対応。
*   **依存関係解決エラー:**
    *   **`langgraph-sdk` バージョン修正:** PyPI に存在しないバージョン (`^0.2.0`) が指定されていたため、利用可能な最新安定版 (`^0.1.51`) に `pyproject.toml` を修正。
    *   **`pandas` バージョン修正:** 当初 `^2.0.0` や `^2.2.0` が見つからなかったため、PyPI で最新版を確認し `^2.2.0` に更新。
    *   **Python バージョン指定の修正:** 実際に使用している Python 3.13 と `pyproject.toml` の指定 (`^3.11`) が異なっていたことが `pandas` の解決エラーの一因と考えられたため、`pyproject.toml` の `python` 指定を `^3.13` に修正。これにより `poetry lock` が成功した。
*   **ライブラリの更新:**
    *   依存関係解決後、`poetry show --outdated` (フルパス指定) で更新可能なライブラリを確認。
    *   `poetry update` (フルパス指定) でライブラリを最新バージョンに更新。

## 4. 残課題・注意点

*   **Poetry の PATH 問題:**
    *   環境変数 `PATH` が正しく設定・反映されず、`poetry` コマンドを直接実行できない問題は未解決。
    *   **当面の対応:** Poetry コマンドはフルパス (`C:\Users\nyham\AppData\Roaming\Python\Scripts\poetry`) で実行する必要がある。
    *   **恒久対策:** PC の再起動、システム環境変数への設定、PowerShell プロファイルの確認などで解決する可能性がある。
*   **Python 3.13 の利用:**
    *   現在プロジェクトは Python 3.13 で動作しているが、`pyproject.toml` で当初 `^3.11` が指定されていた。
    *   Python 3.13 は比較的新しいため、一部ライブラリとの互換性問題が今後も発生する可能性がある。より安定した LTS バージョン (例: 3.11) への切り替えも検討の余地がある。
*   **動作確認:** ライブラリ更新後は、意図しない挙動の変化がないか、アプリケーションの動作テストを行うことが重要。 