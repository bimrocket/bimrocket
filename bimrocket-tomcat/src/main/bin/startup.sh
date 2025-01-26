#!/bin/sh

# bimrocket server startup

cd "$(dirname "$0")/.."

JAVA_OPTS="$JAVA_OPTS --add-opens=java.base/java.lang=ALL-UNNAMED"
JAVA_OPTS="$JAVA_OPTS --add-opens=java.base/java.io=ALL-UNNAMED"
JAVA_OPTS="$JAVA_OPTS --add-opens=java.base/java.util=ALL-UNNAMED"
JAVA_OPTS="$JAVA_OPTS --add-opens=java.base/java.util.concurrent=ALL-UNNAMED"
JAVA_OPTS="$JAVA_OPTS --add-opens=java.rmi/sun.rmi.transport=ALL-UNNAMED"
JAVA_OPTS="$JAVA_OPTS --enable-native-access=ALL-UNNAMED"
JAVA_OPTS="$JAVA_OPTS -Djava.util.logging.manager=org.bimrocket.tomcat.TomcatLogManager"
JAVA_OPTS="$JAVA_OPTS -Djava.util.logging.config.file="conf/logging.properties""

java -cp "lib/*" $JAVA_OPTS org.bimrocket.tomcat.BimRocketTomcat
