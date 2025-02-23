BIMROCKET
=========

Start-up:
  <bimrocket-tomcat-home>/bin/startup(.sh|.bat)

Shutdown:
  <bimrocket-tomcat-home>/bin/shutdown(.sh|.bat)

Data directory:
  By default, bimrocket data is stored in the <user.home>/bimrocket directory.
  This directory can be changed via the BIMROCKET_DATA_PATH JVM property or
  environ variable.

Service configuration file:
  By default, the bimrocket service configuration parameters are specified in
  the bimrocket-server.yaml file located within the data directory.

Default user:
  User: admin
  Password: bimrocket

  This password is defined in the services.security.adminPassword property of
  the service configuration file (bimrocket-server.yaml).
  Other users can be created through the security service endpoint
  (http://localhost:8080/bimrocket-server/swagger/index.html).

More information:
  https://github.com/bimrocket/bimrocket

