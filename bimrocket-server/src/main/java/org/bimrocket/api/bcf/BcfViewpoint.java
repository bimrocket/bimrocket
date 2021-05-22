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

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Id;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author realor
 */
public class BcfViewpoint
{
  @Id
  @JsonProperty("guid")
  private String id;

  @JsonProperty("index")
  private Integer index;

  @JsonProperty("orthogonal_camera")
  private BcfOrthogonalCamera orthogonalCamera;

  @JsonProperty("perspective_camera")
  private BcfPerspectiveCamera perspectiveCamera;

  @JsonProperty("lines")
  List<BcfLine> lines = new ArrayList<>();
  
  @JsonProperty("components")
  BcfComponents components;
  
  @JsonIgnore
  private String topicId;
  
  public String getId()
  {
    return id;
  }

  public void setId(String id)
  {
    this.id = id;
  }  
  
  public Integer getIndex()
  {
    return index;
  }

  public void setIndex(Integer index)
  {
    this.index = index;
  }

  public BcfOrthogonalCamera getOrthogonalCamera()
  {
    return orthogonalCamera;
  }

  public void setOrthogonalCamera(BcfOrthogonalCamera orthogonalCamera)
  {
    this.orthogonalCamera = orthogonalCamera;
  }

  public BcfPerspectiveCamera getPerspectiveCamera()
  {
    return perspectiveCamera;
  }

  public void setPerspectiveCamera(BcfPerspectiveCamera perspectiveCamera)
  {
    this.perspectiveCamera = perspectiveCamera;
  }

  public List<BcfLine> getLines()
  {
    return lines;
  }

  public void setLines(List<BcfLine> lines)
  {
    this.lines = lines;
  }

  public BcfComponents getComponents()
  {
    return components;
  }

  public void setComponents(BcfComponents components)
  {
    this.components = components;
  }
  
  public String getTopicId()
  {
    return topicId;
  }

  public void setTopicId(String topicId)
  {
    this.topicId = topicId;
  }  
}
