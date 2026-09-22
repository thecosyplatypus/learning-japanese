' Learning Japanese - silent launcher.
' Double-click this file: no command-prompt window appears, only the splash screen.
' First run: auto-installs the Electron runtime, then starts the app.
Option Explicit
Dim fso, sh, base, exe
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
exe  = base & "\node_modules\electron\dist\electron.exe"
sh.CurrentDirectory = base

If Not fso.FileExists(exe) Then
  Dim answer
  answer = MsgBox("This is the first time this app has run." & vbCrLf & _
                  "It needs to install the Electron runtime (a one-time download)." & vbCrLf & _
                  "A progress window will appear." & vbCrLf & vbCrLf & _
                  "Install it now?", vbYesNo + vbQuestion, "Learning Japanese")
  If answer <> vbYes Then WScript.Quit 1
  sh.Run "cmd /c npm install", 1, True
  If Not fso.FileExists(exe) Then
    MsgBox "The installation did not complete." & vbCrLf & vbCrLf & _
           "Make sure Node.js is installed from https://nodejs.org, then run this again.", _
           vbExclamation, "Learning Japanese"
    WScript.Quit 1
  End If
End If

' 0 = hidden window, False = keep running while the app runs
sh.Run Chr(34) & exe & Chr(34) & " .", 0, False