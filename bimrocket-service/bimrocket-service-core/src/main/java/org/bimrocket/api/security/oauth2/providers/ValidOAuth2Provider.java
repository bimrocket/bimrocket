/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2026, Ajuntament de Sant Feliu de Llobregat
 *
 * This program is licensed and may be used, modified and redistributed under
 * the terms of the European Public License (EUPL), either version 1.1 or (at
 * your option) any later version as soon as they are approved by the European
 * Commission.
 *
 * Alternatively, you may redistribute and/or modify this program under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either  version 3 of the License, or (at your option)
 * any later version.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the licenses for the specific language governing permissions, limitations
 * and more details.
 *
 * You should have received a copy of the EUPL1.1 and the LGPLv3 licenses along
 * with this program; if not, you may find them at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 * http://www.gnu.org/licenses/
 * and
 * https://www.gnu.org/licenses/lgpl.txt
 */
package org.bimrocket.api.security.oauth2.providers;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Locale;

import org.bimrocket.api.security.User;
import org.bimrocket.api.security.oauth2.TokenInfo;

/**
 *
 * @author jordi.hernandez@i2cat.net
 * @author realor
 */
@ApplicationScoped
public class ValidOAuth2Provider extends AbstractOAuth2Provider
{
  @Override
  public String getName()
  {
    return "valid";
  }

  @Override
  public User getUser(TokenInfo tokenInfo) throws Exception
  {
    String baseUrl = getValue("baseUrl", "");
    String getUserInfoUrl = getValue("getUserInfoUrl", "/serveis-rest/getUserInfo");

    if (getUserInfoUrl.startsWith("/")) getUserInfoUrl = baseUrl + getUserInfoUrl;

    String url = getUserInfoUrl + "?AccessToken=" + tokenInfo.getAccessToken();

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(url))
      .GET()
      .build();

    HttpClient client = HttpClient.newHttpClient();
    HttpResponse<String> response =
      client.send(request, HttpResponse.BodyHandlers.ofString());

    ObjectMapper mapper = new ObjectMapper();
    JsonNode userNode = mapper.readTree(response.body());

    if (!userNode.has("identifier"))
      throw new RuntimeException("Missing identifier field");

    // fill user info into User

    String identifier = userNode.get("identifier").asText();
    User user = new User();

    String givenName = "";
    String surnames = "";

    if (userNode.has("name"))
    {
      givenName = userNode.get("name").asText();
    }
    if (userNode.has("surnames"))
    {
      surnames = userNode.get("surnames").asText();
    }
    else if (userNode.has("surname1"))
    {
      surnames = userNode.get("surname1").asText();
      if (userNode.has("surname2"))
      {
        surnames += " " + userNode.get("surname2").asText();
      }
    }
    String name = (givenName + " " + surnames).trim();
    if (name.length() == 0) name = identifier;
    user.setName(name);

    String email = "";
    if (userNode.has("email"))
    {
      email = userNode.get("email").asText();
      user.setEmail(email);
    }

    if (email!= null && !email.isBlank()){
      user.setId(email);
    }
    else
    {
      user.setId(identifier.toLowerCase(Locale.ROOT));
    }

    user.getRoleIds().addAll(getValues("roles"));
    user.setPasswordHash(getName()); // invalidates login by password

    return user;
  }
}
