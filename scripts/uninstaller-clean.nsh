!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$APPDATA\Business ERP Water POC"
    RMDir /r "$APPDATA\Business ERP Desktop"
    RMDir /r "$LOCALAPPDATA\Business ERP Water POC"
    RMDir /r "$LOCALAPPDATA\Business ERP Desktop"
  ${endIf}
!macroend
