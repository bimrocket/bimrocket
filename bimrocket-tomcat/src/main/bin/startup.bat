@echo off

rem bimrocket server startup

cd %~dp0\..

set "JAVA_OPTS=%JAVA_OPTS% --add-opens=java.base/java.lang=ALL-UNNAMED"
set "JAVA_OPTS=%JAVA_OPTS% --add-opens=java.base/java.io=ALL-UNNAMED"
set "JAVA_OPTS=%JAVA_OPTS% --add-opens=java.base/java.util=ALL-UNNAMED"
set "JAVA_OPTS=%JAVA_OPTS% --add-opens=java.base/java.util.concurrent=ALL-UNNAMED"
set "JAVA_OPTS=%JAVA_OPTS% --add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED"
set "JAVA_OPTS=%JAVA_OPTS% --enable-native-access=ALL-UNNAMED"
set "JAVA_OPTS=%JAVA_OPTS% -Djava.util.logging.manager=org.bimrocket.tomcat.TomcatLogManager"
set "JAVA_OPTS=%JAVA_OPTS% -Djava.util.logging.config.file="conf/logging.properties""

if exist ".\jre" (
  set "JAVA_EXEC=.\jre\bin\java"
) else (
  set "JAVA_EXEC=java"
)

%JAVA_EXEC% -cp lib/* %JAVA_OPTS% org.bimrocket.tomcat.BimRocketTomcat
