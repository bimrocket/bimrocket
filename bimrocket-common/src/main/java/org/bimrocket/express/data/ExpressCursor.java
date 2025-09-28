/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2025, Ajuntament de Sant Feliu de Llobregat
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
package org.bimrocket.express.data;

import org.bimrocket.express.ExpressConstant;
import org.bimrocket.express.ExpressType;

/**
 * An {@code ExpressCursor} is used to explore the objects contained in an
 * {@code ExpressData}. A cursor is a wrapper around an {@ExpressSchema}
 * container object, which is an instance of one of these classes:
 * {@code ExpressEntity}, {@code ExpressDefinedType} or
 * {@code ExpressCollection}.
 * The cursor has methods to get or set the attributes or the items of the
 * container.
 *
 * @author realor
 */

public interface ExpressCursor
{
  public static final Object CONTAINER = new Object()
  {
    @Override
    public String toString() { return "CONTAINER"; }
  };

  /**
   * Returns the ExpressData through which this cursor was obtained.
   *
   * @return The ExpressData
   */
  ExpressData getData();

  /**
   * Gets the value of the specified attribute of the container wrapped by this
   * cursor.
   *
   * @param name the name of the attribute.
   * @return the attribute value which is an instance of {@code String},
   * {@code Number}, {@code ExpressConstant} or the
   * ExpressCursor.CONTAINER instance.
   * ExpressCursor.CONTAINER is returned when the attribute value is another
   * container.
   */
  <V> V get(String name);

  /**
   * Sets a text value for the specified attribute of the container wrapped
   * by this cursor.
   *
   * @param name the name of the attribute.
   * @param value the string to set.
   * @return this cursor.
   */
  ExpressCursor set(String name, String value);

  /**
   * Sets a numeric value for the specified attribute of the container wrapped
   * by this cursor.
   *
   * @param name the name of the attribute.
   * @param value the number to set.
   * @return this cursor.
   */
  ExpressCursor set(String name, Number value);

  /**
   * Sets a constant value for the specified attribute of the container wrapped
   * by this cursor.
   *
   * @param name the name of the attribute.
   * @param value the constant to set.
   * @return this cursor.
   */
  ExpressCursor set(String name, ExpressConstant value);

  /**
   * Sets an entity for the specified attribute of the container wrapped by
   * this cursor.
   *
   * @param name the name of the attribute.
   * @param value the cursor that wraps the entity container to set which
   * corresponds to the same ExpressData than this cursor.
   * @return this cursor.
   */
  ExpressCursor set(String name, ExpressCursor value);

  /**
   * Gets the value at the specified index of the container wrapped by this
   * cursor.
   *
   * @param index the index of the item to get.
   * @return the item value which is an instance of {@code String},
   * {@code Number}, {@code ExpressConstant} or the
   * ExpressCursor.CONTAINER instance.
   * ExpressCursor.CONTAINER is returned when the attribute value is another
   * container.
   */
  <V> V get(int index);

  /**
   * Sets a text value at the specified index of the container wrapped by
   * this cursor.
   *
   * @param index the index in the container.
   * @param value the string to set.
   * If the container is a collection and index is greater than the current
   * collection size, {@code null} values will be added to the collection until
   * its size equals index + 1.
   * @return this cursor.
   */
  ExpressCursor set(int index, String value);

  /**
   * Sets a numeric value at the specified index of the container wrapped
   * by this cursor.
   *
   * @param index the index in the container.
   * @param value the number to set.
   * @return this cursor.
   * @see set(int, String)
   */
  ExpressCursor set(int index, Number value);

  /**
   * Sets a constant value at the specified index of the container
   * wrapped by this cursor.
   *
   * @param index the index in the container.
   * @param value the constant to set.
   * @return this cursor.
   * @see set(int, String)
  */
  ExpressCursor set(int index, ExpressConstant value);

  /**
   * Sets an entity at the specified index of the container wrapped by
   * this cursor.
   *
   * @param index the index in the container.
   * @param value the cursor that wraps the entity container to set which
   * corresponds to the same ExpressData than this cursor.
   * @return this cursor.
   * @see set(int, String)
   */
  ExpressCursor set(int index, ExpressCursor value);

  /**
   * Adds a text value to the collection wrapped by this cursor.
   *
   * @param value the string to add.
   * @return this cursor.
   */
  ExpressCursor add(String value);

  /**
   * Adds a numeric value to the collection wrapped by this cursor.
   *
   * @param value the number to add.
   * @return this cursor.
   */
  ExpressCursor add(Number value);

  /**
   * Adds a constant value to the collection wrapped by this cursor.
   *
   * @param value the constant to add.
   * @return this cursor.
   */
  ExpressCursor add(ExpressConstant value);

  /**
   * Adds an entity to the collection wrapped by this cursor.
   *
   * @param value the cursor that wraps the entity container to set which
   * corresponds to the same ExpressData than this cursor.
   * @return this cursor.
   */
  ExpressCursor add(ExpressCursor value);

  /**
   * Move this cursor to the container referenced by the specified attribute.
   * This method saves the current cursor state in a stack so that it can be
   * restored by calling the exit() method.
   *
   * @param name the name of the attribute that holds a container.
   * @return this cursor.
   */
  ExpressCursor enter(String name);

  /**
   * Move this cursor to the container referenced by the specified index.
   * This method saves the current cursor state in a stack so that it can be
   * restored by calling the exit() method.
   *
   * @param index an index where the container holds another container.
   * @return this cursor.
   */
  ExpressCursor enter(int index);

  /**
   * Restores the previous cursor state.
   *
   * @return this cursor.
   */
  ExpressCursor exit();

  /**
   * Adds a new container to the collection wrapped by this cursor.
   *
   * @param typeName the type name of the new container to add.
   * @return this cursor.
   */
  ExpressCursor create(String typeName);

  /**
   * Creates a new container to the container wrapped by this cursor for the
   * specified attribute.
   * This method enters the new container.
   *
   * @param name the name of the attribute where the new container is to be set.
   * @param typeName the type name of the new container.
   * @return this cursor.
   */
  ExpressCursor create(String name, String typeName);

  /**
   * Creates a new container to the container wrapped by this cursor at the
   * specified index.
   * This method enters the new container.
   *
   * @param index the index where the new container is to be set.
   * @param typeName the type name of the new container.
   * @return this cursor.
   */
  ExpressCursor create(int index, String typeName);

  /**
   * Returns the {@code ExpressType} of the container wrapped by this cursor.
   *
   * @return the ExpressType of the container.
   */
  ExpressType getType();

  /**
   * Returns the identifier of the container wrapped by this cursor.
   * Only entity containers are required to have an identifier.
   *
   * @return the identifier of the container or {@code null} if the container
   * has no identifier.
   */
  String getId();

  /**
   * Returns the number of items of the container wrapper by this cursor.
   *
   * @return the number of items of this container.
   */
  int size();

  /**
   * Returns a copy of this cursor.
   * The returned copy does not preserve the previous cursor states.
   *
   * @return a copy of this cursor.
   */
  ExpressCursor copy();
}