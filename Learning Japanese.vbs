' Learning Japanese - silent launcher.
' Double-click this file: no command-prompt window appears, only the splash screen.
Option Explicit
Dim fso, sh, base, exe
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
exe  = base & "\node_modules\electron\dist\electron.exe"

If Not fso.FileExists(exe) Then
  MsgBox "Electron is not installed yet." & vbCrLf & vbCrLf & _
         "Open a terminal in this folder and run:  npm install", _
         vbExclamation, "Learning Japanese"
  WScript.Quit 1
End If

sh.CurrentDirectory = base
' 0 = hidden window, False = keep running while the app runs
sh.Run Chr(34) & exe & Chr(34) & " .", 0, False