package org.bimrocket.dao.mongo;

import org.bson.*;
import org.bson.codecs.*;
import java.util.*;
import org.bson.codecs.configuration.CodecRegistry;
import org.bson.types.ObjectId;

public class ObjectCodec implements Codec<Object> {

  private final CodecRegistry registry;

  public ObjectCodec(CodecRegistry registry)
  {
    this.registry = registry;
  }

  @Override
  public void encode(BsonWriter writer, Object value, EncoderContext encoderContext)
  {
    if (value == null)
    {
      writer.writeNull();
    }
    else if (value instanceof Map<?, ?> map)
    {
      writer.writeStartDocument();
      for (Map.Entry<?, ?> e : map.entrySet())
      {
        writer.writeName(e.getKey().toString());
        encode(writer, e.getValue(), encoderContext);
      }
      writer.writeEndDocument();
    }
    else if (value instanceof List<?> list)
    {
      writer.writeStartArray();
      for (Object item : list)
      {
        encode(writer, item, encoderContext);
      }
      writer.writeEndArray();
    } else if (value instanceof String s)
    {
      writer.writeString(s);
    } else if (value instanceof Integer i)
    {
      writer.writeInt32(i);
    } else if (value instanceof Long l)
    {
      writer.writeInt64(l);
    } else if (value instanceof Double d)
    {
      writer.writeDouble(d);
    } else if (value instanceof Boolean b)
    {
      writer.writeBoolean(b);
    } else if (value instanceof ObjectId oid)
    {
      writer.writeObjectId(oid);
    } else
    {
      // Si es otro tipo, intentamos usar un codec ya existente
      @SuppressWarnings("unchecked")
      Codec<Object> codec = (Codec<Object>) registry.get(value.getClass());
      codec.encode(writer, value, encoderContext);
    }
  }

  @Override
  public Object decode(BsonReader reader, DecoderContext decoderContext)
  {
    BsonType type = reader.getCurrentBsonType();
    return switch (type)
    {
      case NULL -> { reader.readNull(); yield null; }
      case STRING -> reader.readString();
      case INT32 -> reader.readInt32();
      case INT64 -> reader.readInt64();
      case DOUBLE -> reader.readDouble();
      case BOOLEAN -> reader.readBoolean();
      case OBJECT_ID -> reader.readObjectId();
      case ARRAY ->
      {
        List<Object> list = new ArrayList<>();
        reader.readStartArray();
        while (reader.readBsonType() != BsonType.END_OF_DOCUMENT)
        {
          list.add(decode(reader, decoderContext));
        }
        reader.readEndArray();
        yield list;
      }
      case DOCUMENT ->
      {
        Map<String, Object> map = new LinkedHashMap<>();
        reader.readStartDocument();
        while (reader.readBsonType() != BsonType.END_OF_DOCUMENT)
        {
          String key = reader.readName();
          map.put(key, decode(reader, decoderContext));
        }
        reader.readEndDocument();
        yield map;
      }
      default -> throw new BsonInvalidOperationException("Tipo BSON no soportado: " + type);
    };
  }

  @Override
  public Class<Object> getEncoderClass()
  {
    return Object.class;
  }
}