## Image Generation for Backend

- The `bimrocket-server.war` file must be generated.

- Copy the WAR file to the `bimrocket/docker_preimage/backend` directory.

- Run:
  ```sh 
  docker build -t bimrocket-server .
  ```


## Deployment of Docker Containers for Backend and OrientDB

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

**Explanation:**
<br>
_(<host_port>:<container_port>)_

<host_port>: It is the port of your host machine, that is, where you access from your browser or from outside the container. 
<br> 
<container_port>: It is the internal port of the container, connection between containers.

### Modifying properties
- In the file `/src/main/resources/application.yaml`, modify the `url` properties:

  - To work with the local database:
    ```
    databases:
    bimdb:
    url: embedded:${bimrocket.location}/db/bimdb
    username: root
    password: orientdb
    IFC2X3:
    url: embedded:${bimrocket.location}/db/IFC2X3
    username: root
    password: orientdb
    IFC4:
    url: embedded:${bimrocket.location}/db/IFC4
    username: root
    password: orientdb
    ```

  - To work with a remote database:
    ```
    databases:
    bimdb:
    url: remote:orientdb/bimdb
    username: root
    password: orientdb
    IFC2X3:
    url: remote:orientdb/IFC2X3
    username: root
    password: orientdb
    IFC4:
    url: remote:orientdb/IFC4
    username: root
    password: orientdb
    ```

### Build and starts up
- Build the project with:
  ```sh
  mvn clean install
  ```

- From the `/docker` directory, deploy the containers:
  ```sh
  docker-compose up --build -d
  ```
- Once the containers are up, create the `bimdb` database from the OrientDB browser. Go to: http://localhost:2480 (default port)

- Click on the **NEW DB** button to add the new schema using the credentials specified in `application.yaml`.

  ![Orientdb browser](../docs/orientdb_browser.png?raw=true "Orientdb browser")

- To access the Backend API: http://localhost:9090/bimrocket-server/  (default port)