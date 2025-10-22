package org.bimrocket.dao.mongo;

import org.bson.*;
import org.bson.codecs.*;

import java.util.HashMap;
import java.util.Map;

public class ObjectCodec implements Codec<Object>
{
  @Override
  public void encode(BsonWriter writer, Object value, EncoderContext encoderContext)
  {
    if (value instanceof Map<?, ?> map)
    {
      writer.writeStartDocument();
      for (Map.Entry<?, ?> entry : map.entrySet())
      {
        writer.writeName(entry.getKey().toString());
        Object entryValue = entry.getValue();

        if (entryValue instanceof Map<?, ?>)
        {
          // recursive call for nested Maps
          encode(writer, entryValue, encoderContext);
        }
        else if (entryValue instanceof String s)
        {
          writer.writeString(s);
        }
        else if (entryValue instanceof Integer i)
        {
          writer.writeInt32(i);
        }
        else if (entryValue instanceof Long l)
        {
          writer.writeInt64(l);
        }
        else if (entryValue instanceof Boolean b)
        {
          writer.writeBoolean(b);
        }
        else if (entryValue instanceof Double d)
        {
          writer.writeDouble(d);
        }
        else
        {
          // fallback: write as string
          writer.writeString(entryValue.toString());
        }
      }
      writer.writeEndDocument();
    }
    else
    {
      // If not Map, fallback like string
      writer.writeString(value.toString());
    }
  }

  @Override
  public Object decode(BsonReader reader, DecoderContext decoderContext)
  {
    BsonType currentType = reader.getCurrentBsonType();

    if (currentType == BsonType.DOCUMENT) {
      Map<String, Object> map = new HashMap<>();
      reader.readStartDocument();
      while (reader.readBsonType() != BsonType.END_OF_DOCUMENT)
      {
        String key = reader.readName();
        BsonType type = reader.getCurrentBsonType();

        switch (type)
        {
          case DOCUMENT -> map.put(key, decode(reader, decoderContext)); // recursive
          case STRING -> map.put(key, reader.readString());
          case INT32 -> map.put(key, reader.readInt32());
          case INT64 -> map.put(key, reader.readInt64());
          case DOUBLE -> map.put(key, reader.readDouble());
          case BOOLEAN -> map.put(key, reader.readBoolean());
          default -> reader.skipValue(); // ignore unknown types
        }
      }
      reader.readEndDocument();
      return map;
    }
    else if (currentType == BsonType.STRING)
    {
      return reader.readString(); // fallback
    }
    else
    {
      reader.skipValue();
      return null;
    }
  }

  @Override
  public Class<Object> getEncoderClass()
  {
    return Object.class;
  }
}
