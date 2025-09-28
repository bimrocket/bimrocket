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

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
import org.bimrocket.express.ExpressAttribute;
import org.bimrocket.express.ExpressCollection;
import org.bimrocket.express.ExpressEntity;
import org.bimrocket.express.ExpressSchema;
import static org.bimrocket.express.ExpressCollection.*;
import org.bimrocket.express.ExpressConstant;
import org.bimrocket.express.ExpressDefinedType;
import org.bimrocket.express.ExpressPrimitive;
import org.bimrocket.express.ExpressType;

/**
 *
 * @author realor
 * @param <E>
 * @param <C>
 */
public abstract class AbstractData<E, C> implements ExpressData
{
  final ExpressSchema schema;
  protected List<E> elements = new ArrayList<>();
  protected String definedTypeValueName = "value";

  public AbstractData(ExpressSchema schema)
  {
    this.schema = schema;
  }

  @Override
  public ExpressSchema getSchema()
  {
    return schema;
  }

  @Override
  public ExpressCursor getRoot()
  {
    return new Cursor(elements);
  }

  public List<E> getElements()
  {
    return elements;
  }

  // element methods

  protected abstract E getElement(Object value);

  protected abstract E createEntity(ExpressEntity entity);

  protected abstract E createDefinedType(ExpressDefinedType definedType);

  protected abstract String getElementTypeName(E element);

  protected abstract String getElementId(E element);

  protected abstract Object getElementValue(E element, String name, ExpressType type);

  protected abstract void setElementValue(E element, String name, Object value, ExpressType type);

  // collection methods

  protected abstract C getCollection(Object value);

  protected abstract C createCollection(String colTypeName);

  protected abstract void setCollectionValue(C collection, int index, Object value, ExpressType type);

  protected abstract Object getCollectionValue(C collection, int index, ExpressType type);

  protected abstract void addCollectionValue(C collection, Object value, ExpressType type);

  protected abstract int getCollectionSize(C collection);

  public class Cursor implements ExpressCursor
  {
    protected Object container;
    protected ExpressType type;
    protected Stack<Object> stack;

    protected Cursor(Object container)
    {
      this.container = container;
      E element = getElement(container);
      if (element != null)
      {
        type = schema.getNamedType(getElementTypeName(element));
      }
      else // collection
      {
        type = new ExpressCollection(LIST);
      }
    }

    protected Cursor(Object container, ExpressType type)
    {
      this.container = container;
      this.type = type;
    }

    @Override
    public ExpressData getData()
    {
      return AbstractData.this;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <V> V get(String name)
    {
      return (V)wrap(internalGet(name), name);
    }

    @Override
    public ExpressCursor set(String name, String value)
    {
      internalSet(name, value);
      return this;
    }

    @Override
    public ExpressCursor set(String name, Number value)
    {
      internalSet(name, value);
      return this;
    }

    @Override
    public ExpressCursor set(String name, ExpressConstant value)
    {
      internalSet(name, value);
      return this;
    }

    @Override
    public ExpressCursor set(String name, ExpressCursor value)
    {
      internalSet(name, unwrap(value));
      return this;
    }

    @Override
    @SuppressWarnings("unchecked")
    public <V> V get(int index)
    {
      return (V)wrap(internalGet(index), index);
    }

    @Override
    public ExpressCursor set(int index, String value)
    {
      internalSet(index, value);
      return this;
    }

    @Override
    public ExpressCursor set(int index, Number value)
    {
      internalSet(index, value);
      return this;
    }

    @Override
    public ExpressCursor set(int index, ExpressConstant value)
    {
      internalSet(index, value);
      return this;
    }

    @Override
    public ExpressCursor set(int index, ExpressCursor value)
    {
      internalSet(index, unwrap(value));
      return this;
    }

    @Override
    public ExpressCursor add(String value)
    {
      internalSet(null, value);
      return this;
    }

    @Override
    public ExpressCursor add(Number value)
    {
      internalSet(null, value);
      return this;
    }

    @Override
    public ExpressCursor add(ExpressConstant value)
    {
      internalSet(null, value);
      return this;
    }

    @Override
    public ExpressCursor add(ExpressCursor value)
    {
      internalSet(null, unwrap(value));
      return this;
    }

    @Override
    public ExpressCursor create(String typeName)
    {
      internalCreate(null, typeName);
      return this;
    }

    @Override
    public ExpressCursor create(int index, String typeName)
    {
      internalCreate(index, typeName);
      return this;
    }

    @Override
    public ExpressCursor create(String name, String typeName)
    {
      internalCreate(name, typeName);
      return this;
    }

    @Override
    public ExpressCursor enter(String name)
    {
      Object newContainer = internalGet(name);
      ExpressType newType = getContainerType(newContainer, name);
      internalEnter(newContainer, newType);
      return this;
    }

    @Override
    public ExpressCursor enter(int index)
    {
      Object newContainer = internalGet(index);
      ExpressType newType = getContainerType(newContainer, index);
      internalEnter(newContainer, newType);
      return this;
    }

    @Override
    public ExpressCursor exit()
    {
      if (stack == null || stack.isEmpty())
        throw new RuntimeException("Empty cursor stack");

      Object oldContainer = container;

      type = (ExpressType)stack.pop();
      container = stack.pop();

      if (oldContainer instanceof DefinedTypeValue definedTypeValue)
      {
        internalSet(definedTypeValue.selector, definedTypeValue.value);
      }
      return this;
    }

    @Override
    public ExpressType getType()
    {
      return type;
    }

    @Override
    public String getId()
    {
      E element = getElement(container);
      if (element != null)
      {
        return getElementId(element);
      }
      return null;
    }

    @Override
    public int size()
    {
      if (type instanceof ExpressEntity entity)
      {
        return entity.getAllAttributes().size();
      }

      if (type instanceof ExpressDefinedType)
      {
        return 1;
      }

      C collection = getCollection(container);
      if (collection != null)
      {
        return getCollectionSize(collection);
      }
      return 0;
    }

    @Override
    public ExpressCursor copy()
    {
      return new Cursor(container, type);
    }

    @Override
    public String toString()
    {
      return container.toString();
    }

    protected Object internalGet(Object selector)
    {
      E element = getElement(container);
      if (element != null)
      {
        ExpressAttribute attribute;
        if (type instanceof ExpressEntity entity)
        {
          if (selector instanceof Integer index)
          {
            attribute = entity.getAllAttributes().get(index);
          }
          else if (selector instanceof String name)
          {
            attribute = entity.getAttribute(name);
          }
          else throw new RuntimeException("Invalid selector: " + selector);

          ExpressType expectedType = attribute.getType();
          if (expectedType instanceof ExpressDefinedType definedType)
          {
            expectedType = definedType.getRootType();
          }
          return getElementValue(element, attribute.getName(), expectedType);
        }
        else if (type instanceof ExpressDefinedType definedType)
        {
          return getElementValue(element, definedTypeValueName,
            definedType.getRootType());
        }
        return null;
      }

      C collection = getCollection(container);
      if (collection != null)
      {
        if (type instanceof ExpressCollection colType)
        {
          ExpressType expectedType = colType.getItemType();
          if (expectedType instanceof ExpressDefinedType definedType)
          {
            expectedType = definedType.getRootType();
          }
          int index = (Integer)selector;

          return getCollectionValue(collection, index, expectedType);
        }
        return null;
      }

      if (container instanceof DefinedTypeValue definedTypeValue)
      {
        return definedTypeValue.value;
      }
      return null;
    }

    protected void internalSet(Object selector, Object value)
    {
      E element = getElement(container);
      if (element != null)
      {
        ExpressAttribute attribute;
        if (type instanceof ExpressEntity entity)
        {
          if (selector instanceof Integer index)
          {
            attribute = entity.getAllAttributes().get(index);
          }
          else if (selector instanceof String name)
          {
            attribute = entity.getAttribute(name);
          }
          else throw new RuntimeException("Invalid selector: " + selector);

          ExpressType expectedType = attribute.getType();
          if (expectedType instanceof ExpressDefinedType definedType)
          {
            expectedType = definedType.getRootType();
          }
          setElementValue(element, attribute.getName(), value, expectedType);
        }
        else if (type instanceof ExpressDefinedType definedType)
        {
          ExpressType expectedType = definedType.getRootType();
          setElementValue(element, definedTypeValueName, value, expectedType);
        }
        return;
      }

      C collection = getCollection(container);
      if (collection != null)
      {
        if (type instanceof ExpressCollection colType)
        {
          ExpressType expectedType = colType.getItemType();
          if (expectedType instanceof ExpressDefinedType definedType)
          {
            expectedType = definedType.getRootType();
          }

          if (selector == null)
          {
            addCollectionValue(collection, value, expectedType);
          }
          else
          {
            int index = (Integer)selector;
            while (getCollectionSize(collection) <= index)
            {
              addCollectionValue(collection, null, expectedType);
            }
            setCollectionValue(collection, index, value, expectedType);
          }
        }
        return;
      }

      if (container instanceof DefinedTypeValue definedTypeValue)
      {
        definedTypeValue.value = value;
      }
    }

    protected void internalCreate(Object selector, String typeName)
    {
      Object newContainer;
      ExpressType newType = schema.getNamedType(typeName);
      if (newType instanceof ExpressEntity entity)
      {
        newContainer = createEntity(entity);
      }
      else if (newType instanceof ExpressDefinedType definedType)
      {
        if (isPrimitiveDefinedType(selector))
        {
          newContainer = new DefinedTypeValue(selector);
        }
        else
        {
          newContainer = createDefinedType(definedType);
        }
      }
      else if (isCollection(typeName))
      {
        newContainer = createCollection(typeName);
        newType = getExpectedType(selector);
      }
      else throw new RuntimeException("Not a container type: " + typeName);

      internalSet(selector, newContainer);

      internalEnter(newContainer, newType);
    }

    protected void internalEnter(Object newContainer, ExpressType newType)
    {
      if (stack == null) stack = new Stack<>();
      stack.push(container);
      stack.push(type);
      container = newContainer;
      type = newType;
    }

    protected Object wrap(Object value, Object selector)
    {
      E element = getElement(value);
      if (element != null)
      {
        return CONTAINER;
      }

      C collection = getCollection(value);
      if (collection != null)
      {
        return CONTAINER;
      }
      return value;
    }

    protected Object unwrap(Object value)
    {
      if (value instanceof AbstractData<?,?>.Cursor cursor)
      {
        if (cursor.type instanceof ExpressEntity)
        {
          return cursor.container;
        }
        throw new RuntimeException("Not an entity cursor");
      }
      return value;
    }

    protected boolean isPrimitiveDefinedType(Object selector)
    {
      ExpressType expectedType = getExpectedType(selector);
      if (expectedType instanceof ExpressDefinedType expectedDefinedType)
      {
        ExpressPrimitive primitive = expectedDefinedType.getPrimitive();
        return primitive != null;
      }
      return false;
    }

    protected ExpressType getContainerType(Object aContainer, Object selector)
    {
      E element = getElement(aContainer);
      if (element != null)
      {
        return schema.getNamedType(getElementTypeName(element));
      }

      C collection = getCollection(aContainer);
      if (collection != null)
      {
        return getExpectedType(selector);
      }
      throw new RuntimeException("Not a container");
    }

    protected ExpressType getExpectedType(Object selector)
    {
      ExpressType expectedType;
      if (type instanceof ExpressEntity entity)
      {
        if (selector instanceof Integer index)
        {
          expectedType = entity.getAllAttributes().get(index).getType();
        }
        else if (selector instanceof String name)
        {
          expectedType = entity.getAttribute(name).getType();
        }
        else throw new RuntimeException("Invalid selector: " + selector);
      }
      else if (type instanceof ExpressDefinedType definedType)
      {
        expectedType = definedType.getRootType();
      }
      else if (type instanceof ExpressCollection col)
      {
        expectedType = col.getItemType();
      }
      else expectedType = null;

      return expectedType;
    }
  }

  static class DefinedTypeValue
  {
    Object selector;
    Object value;

    DefinedTypeValue(Object selector)
    {
      this.selector = selector;
    }
  }
}