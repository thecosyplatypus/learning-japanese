' Learning Japanese - silent launcher.
' Double-click this file: no command-prompt window appears, only the splash screen.
' First run: auto-installs Node.js and the Electron runtime, then starts the app.
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
                  "It needs to install Node.js and the Electron runtime (a one-time download)." & vbCrLf & _
                  "Progress will be shown in a window." & vbCrLf & vbCrLf & _
                  "Install now?", vbYesNo + vbQuestion, "Learning Japanese")
  If answer <> vbYes Then WScript.Quit 1
  sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & base & "\setup.ps1""", 1, True
  If Not fso.FileExists(exe) Then
    MsgBox "The installation did not complete." & vbCrLf & vbCrLf & _
           "Check your internet connection and try again, or run setup.ps1 manually for details.", _
           vbExclamation, "Learning Japanese"
    WScript.Quit 1
  End If
End If

' 0 = hidden window, False = keep running while the app runs
sh.Run Chr(34) & exe & Chr(34) & " .", 0, False