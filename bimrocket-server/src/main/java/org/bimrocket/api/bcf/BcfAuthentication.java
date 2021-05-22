/*
 * BIMROCKET
 *  
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.api.bcf;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author realor
 */
public class BcfAuthentication
{
  @JsonProperty("oauth2_auth_url")
  private String oauth2AuthUrl;
  
  @JsonProperty("oauth2_token_url")
  private String oauth2TokenUrl;
  
  @JsonProperty("oauth2_dynamic_client_reg_url")	
  private String oauth2DynamicClientRegUrl;
  
  @JsonProperty("http_basic_supported")	
  boolean httpBasicSupported;
  
  @JsonProperty("supported_oauth2_flows")
  List<String> supportedOauth2Flows = new ArrayList<>();

  public String getOauth2AuthUrl()
  {
    return oauth2AuthUrl;
  }

  public void setOauth2AuthUrl(String oauth2AuthUrl)
  {
    this.oauth2AuthUrl = oauth2AuthUrl;
  }

  public String getOauth2TokenUrl()
  {
    return oauth2TokenUrl;
  }

  public void setOauth2TokenUrl(String oauth2TokenUrl)
  {
    this.oauth2TokenUrl = oauth2TokenUrl;
  }

  public String getOauth2DynamicClientRegUrl()
  {
    return oauth2DynamicClientRegUrl;
  }

  public void setOauth2DynamicClientRegUrl(String oauth2DynamicClientRegUrl)
  {
    this.oauth2DynamicClientRegUrl = oauth2DynamicClientRegUrl;
  }

  public boolean isHttpBasicSupported()
  {
    return httpBasicSupported;
  }

  public void setHttpBasicSupported(boolean httpBasicSupported)
  {
    this.httpBasicSupported = httpBasicSupported;
  }

  public List<String> getSupportedOauth2Flows()
  {
    return supportedOauth2Flows;
  }

  public void setSupportedOauth2Flows(List<String> supportedOauth2Flows)
  {
    this.supportedOauth2Flows = supportedOauth2Flows;
  }
}
