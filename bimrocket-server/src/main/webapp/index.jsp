<%--
    Document   : index
    Created on : 07-nov-2021, 12:19:55
    Author     : realor
--%>

<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>BIMROCKET</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">

    <link rel="icon" type="image/png" href="favicon/favicon-96x96.png?v=20261003" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="favicon/favicon.svg?v=20261003" />
    <link rel="shortcut icon" href="favicon/favicon.ico?v=20261003" />
    <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png?v=20261003" />
    <link rel="manifest" href="favicon/site.webmanifest?v=20261003" />

    <meta name="msapplication-TileColor" content="#ffffff">
    <meta name="msapplication-TileImage" content="favicon/ms-icon-144x144.png">
    <meta name="theme-color" content="#ffffff">
    <link href="css/bimrocket.css" type="text/css" rel="stylesheet"/>
  </head>
  <body>
    <div id="logo">
      <img src="css/images/bimrocket.svg" title="BIMROCKET" alt="BIMROCKET"><span>SERVER</span>
    </div>
    <p>Version <%= org.bimrocket.util.BimRocketInfo.getVersionLabel() %><p>

    <p><a href="swagger/index.html" target="swagger" title="api (new window)">HTTP REST API</a></p>

  </body>
</html>
