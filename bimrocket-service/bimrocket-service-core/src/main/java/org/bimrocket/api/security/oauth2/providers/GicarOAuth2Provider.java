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
import org.bimrocket.api.security.User;
import org.bimrocket.api.security.oauth2.TokenInfo;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Locale;

/**
 *
 * @author jordi.hernandez@i2cat.net
 * @author realor
 */
@ApplicationScoped
public class GicarOAuth2Provider extends AbstractOAuth2Provider
{
  @Override
  public String getName()
  {
    return "gicar";
  }

  @Override
  public User getUser(TokenInfo tokenInfo) throws Exception
  {
    String baseUrl = getValue("baseUrl", "");
    String getUserInfoUrl = getValue("getUserInfoUrl", "/userInfo");

    if (getUserInfoUrl.startsWith("/")) getUserInfoUrl = baseUrl + getUserInfoUrl;

    String url = getUserInfoUrl;

    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(url))
      .header("Authorization", "Bearer " + tokenInfo.getAccessToken())
      .GET()
      .build();

    HttpClient client = HttpClient.newHttpClient();
    HttpResponse<String> response =
      client.send(request, HttpResponse.BodyHandlers.ofString());

    ObjectMapper mapper = new ObjectMapper();
    JsonNode userNode = mapper.readTree(response.body());

    if (!userNode.has("preferred_username"))
      throw new RuntimeException("Missing preferred_username field");

    // fill user info into User

    String preferredUsername = userNode.get("preferred_username").asText();
    User user = new User();
    user.setId(preferredUsername);

    String givenName = "";
    String surnames = "";

    if (userNode.has("name"))
    {
      givenName = userNode.get("name").asText();
    }
    if (userNode.has("given_name"))
    {
      surnames = userNode.get("given_name").asText();
      if (userNode.has("family_name"))
      {
        surnames += " " + userNode.get("family_name").asText();
      }
    }
    String name = (givenName + " " + surnames).trim();
    if (name.length() == 0) name = preferredUsername;
    user.setName(name);

    String email = "";
    if (userNode.has("email"))
    {
      email = userNode.get("email").asText();
      user.setEmail(email);
    }

    List<String> roles = getValues("roles");
    if (roles != null && roles.size() >= 2)
    {
      if (email != null &&
        (email.toLowerCase(Locale.ROOT).endsWith("@gencat.cat") ||
         email.toLowerCase(Locale.ROOT).endsWith("@amb.cat") ||
         email.toLowerCase(Locale.ROOT).endsWith("@bcn.cat")))
      {
        user.getRoleIds().add(roles.get(0)); // VECTOR-UT-OGE
      }
      else
      {
        user.getRoleIds().add(roles.get(1)); // PROJECTISTA
      }
    }
    
    user.setPasswordHash(getName()); // invalidates login by password

    return user;
  }
}
