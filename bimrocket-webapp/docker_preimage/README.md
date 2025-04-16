## Image Generation for Frontend

- The `bimrocket.war` file must be generated.

- Copy the WAR file to the `/docker_preimage/frontend` directory.

- Run:
  ```sh 
  docker build -t bimrocket-webapp .
  ```


## Deploying the Frontend Docker Container

### Container ports
- **Bimrocket Server Container:** _bimrocket-server/docker/docker-compose.yml_
```
bimrocket-server:
  ports:
      - "9090:8080"

orientdb:
  ports:
      - "2424:2424" # Binary protocol
      - "2480:2480" # HTTP protocol
```

- **Bimrocket Webapp Container:** _bimrocket-webapp/docker/docker-compose.yml_
```
bimrocket-webapp:
  ports:
      - "8181:8080"
```

**Explanation**:
<br>
_(<host_port>:<container_port>)_ 

<host_port>: It is the port of your host machine, that is, where you access from your browser or from outside the container. 
<br> 
<container_port>: It is the internal port of the container, connection between containers.


### Modifying properties
  - In the file _/src/main/webapp/js/Environment.js_, modify the property **SERVER_URL**:

    ```
    export const Environment =
    {
    SERVER_URL : "http://localhost:9090/bimrocket-server",
    SERVER_ALIAS : "bimrocket",
    MODULES : ["base", "bim", "gis"]
    };
    ```

### Build and starts up
  - Build the project with:
    ```sh
    mvn clean install
    ```

  - From the bimrocket/docker directory, deploy the container:
    ```sh
    docker-compose up --build -d
    ```
  
  - To access the **Frontend**, open your browser and go to: [http://localhost:8181/bimrocket](http://localhost:8181/bimrocket) (default port)

