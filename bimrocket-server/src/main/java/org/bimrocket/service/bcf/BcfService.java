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
package org.bimrocket.service.bcf;

import jakarta.inject.Inject;
import jakarta.servlet.ServletContext;
import jakarta.ws.rs.core.Application;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.commons.lang.StringUtils;
import org.bimrocket.api.bcf.BcfComment;
import org.bimrocket.api.bcf.BcfDocumentReference;
import org.bimrocket.api.bcf.BcfExtensions;
import org.bimrocket.api.bcf.BcfProject;
import org.bimrocket.api.bcf.BcfSnapshot;
import org.bimrocket.api.bcf.BcfTopic;
import org.bimrocket.api.bcf.BcfViewpoint;
import org.bimrocket.dao.Dao;
import org.bimrocket.dao.DaoConnection;
import org.bimrocket.dao.DaoConnectionFactory;
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.odata.SimpleODataParser;
import org.bimrocket.service.mail.MailService;
import org.jvnet.hk2.annotations.Service;
import java.util.logging.Logger;
import org.apache.commons.text.StringSubstitutor;
import static java.util.Arrays.asList;


/**
 *
 * @author realor
 */
@Service
public class BcfService
{
  static final String MAIL_CREATE_TOPIC_SUBJECT = "bcf.mail.createTopic.subject";
  static final String MAIL_CREATE_TOPIC_MESSAGE = "bcf.mail.createTopic.message";

  static final String PROJECT_TEMPLATE = "project_template";

  static final Map<String, String> topicFieldMap = new HashMap<>();

  static final Logger LOGGER =
    Logger.getLogger(BcfService.class.getName());

  static
  {
    topicFieldMap.put("topic_status", "topicStatus");
    topicFieldMap.put("topic_type", "topicType");
    topicFieldMap.put("priority", "priority");
    topicFieldMap.put("assigned_to", "assignedTo");
    topicFieldMap.put("creation_date", "creationDate");
    topicFieldMap.put("index", "index");
  }

  @Inject
  ServletContext servletContext;

  @Inject
  Application application;

  @Inject
  MailService mailService;

  /* Projects */

  public List<BcfProject> getProjects()
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> dao = conn.getDao(BcfProject.class);
      return dao.select(Collections.emptyMap(), asList("name"));
    }
  }

  public BcfProject getProject(String projectId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> dao = conn.getDao(BcfProject.class);
      return dao.select(projectId);
    }
  }

  public BcfProject updateProject(
    String projectId, BcfProject projectUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> dao = conn.getDao(BcfProject.class);
      BcfProject project = dao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setId(projectId);
        project.setName(projectUpdate.getName());
        project = dao.insert(project);
      }
      else
      {
        project.setName(projectUpdate.getName());
        project = dao.update(project);
      }
      return project;
    }
  }

  /* Extensions */

  public BcfExtensions getExtensions(String projectId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> projectDao = conn.getDao(BcfProject.class);
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> dao = conn.getDao(BcfExtensions.class);
      BcfExtensions extensions = dao.select(projectId);
      if (extensions == null)
      {
        extensions = new BcfExtensions();
        BcfExtensions template = dao.select(PROJECT_TEMPLATE);
        if (template == null)
        {
          extensions.setDefaultValues();
        }
        else
        {
          extensions = template;
        }
        extensions.setProjectId(projectId);
        extensions = dao.insert(extensions);
      }
      return extensions;
    }
  }

  public BcfExtensions updateExtensions(
    String projectId, BcfExtensions extensionsUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> projectDao = conn.getDao(BcfProject.class);
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> dao = conn.getDao(BcfExtensions.class);
      BcfExtensions extensions = dao.select(projectId);
      if (extensions == null)
      {
        extensionsUpdate.setProjectId(projectId);
        return dao.insert(extensionsUpdate);
      }
      else
      {
        extensionsUpdate.setProjectId(projectId);
        return dao.update(extensionsUpdate);
      }
    }
  }

  /* Topics */

  public List<BcfTopic> getTopics(String projectId,
    String odataFilter, String odataOrderBy)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      SimpleODataParser parser = new SimpleODataParser(topicFieldMap);
      Map<String, Object> filter = parser.parseFilter(odataFilter);
      filter.put("projectId", projectId);
      List<String> orderBy = parser.parseOrderBy(odataOrderBy);
      return dao.select(filter, orderBy);
    }
  }

  public BcfTopic getTopic(String projectId, String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      return dao.select(topicId);
    }
  }

  public BcfTopic createTopic(String projectId, BcfTopic topic)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfProject> projectDao = conn.getDao(BcfProject.class);
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        project.incrementLastTopicIndex();
        project = projectDao.insert(project);
      }
      else
      {
        project.incrementLastTopicIndex();
        project = projectDao.update(project);
      }

      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      topic.setId(UUID.randomUUID().toString());
      topic.setProjectId(projectId);
      String dateString = getDateString();

      topic.setCreationDate(dateString);
      topic.setModifyDate(dateString);
      topic.setIndex(project.getLastTopicIndex());
      topic = dao.insert(topic);

      if (mailService.isEnabled() && topic.getAssignedTo() != null)
      {
        Map<String, String> vars = new HashMap<>();
        vars.put("project.name", project.getName());
        vars.put("project.id", project.getId());
        vars.put("index", String.valueOf(topic.getIndex()));
        vars.put("id", topic.getId());
        vars.put("title", topic.getTitle());
        vars.put("priority", topic.getPriority());
        vars.put("description", topic.getDescription());

        String subjectPattern =
          servletContext.getInitParameter(MAIL_CREATE_TOPIC_SUBJECT);

        String messagePattern =
          servletContext.getInitParameter(MAIL_CREATE_TOPIC_MESSAGE);

        StringSubstitutor substitutor = new StringSubstitutor(vars);
        String subject = substitutor.replace(subjectPattern);
        String message = substitutor.replace(messagePattern);

        mailService.sendMail(null, topic.getAssignedTo(), subject,
          message, null);
      }
      return topic;
    }
  }

  public BcfTopic updateTopic(String projectId, String topicId,
    BcfTopic topicUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      BcfTopic topic = dao.select(topicId);
      if (topic == null) throw new RuntimeException("Topic not found");

      topic.setTitle(topicUpdate.getTitle());
      topic.setTopicType(topicUpdate.getTopicType());
      topic.setPriority(topicUpdate.getPriority());
      topic.setStage(topicUpdate.getStage());
      topic.setTopicStatus(topicUpdate.getTopicStatus());
      topic.setReferenceLinks(topicUpdate.getReferenceLinks());
      topic.setDescription(topicUpdate.getDescription());
      topic.setDueDate(topicUpdate.getDueDate());
      topic.setAssignedTo(topicUpdate.getAssignedTo());
      String dateString = getDateString();
      topic.setModifyDate(dateString);
      return dao.update(topic);
    }
  }

  public void deleteTopic(String projectId, String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> dao = conn.getDao(BcfTopic.class);
      dao.delete(topicId);

      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      Dao<BcfComment> commentDao = conn.getDao(BcfComment.class);
      commentDao.delete(filter);

      Dao<BcfViewpoint> viewpointDao = conn.getDao(BcfViewpoint.class);
      viewpointDao.delete(filter);
    }
  }

  /* Comments */

  public List<BcfComment> getComments(String projectId, String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.select(filter, asList("date"));
    }
  }

  public BcfComment getComment(String projectId, String topicId,
    String commentId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      return dao.select(commentId);
    }
  }

  public BcfComment createComment(String projectId, String topicId,
    BcfComment comment)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      comment.setId(UUID.randomUUID().toString());
      comment.setTopicId(topicId);
      String dateString = getDateString();
      comment.setDate(dateString);
      comment.setModifyDate(dateString);
      return dao.insert(comment);
    }
  }

  public BcfComment updateComment(String projectId, String topicId,
    String commentId, BcfComment commentUpdate)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      BcfComment comment = dao.select(commentId);
      if (comment == null) throw new RuntimeException("Comment not found");

      comment.setComment(commentUpdate.getComment());
      comment.setViewpointId(commentUpdate.getViewpointId());
      comment.setReplayToCommentId(comment.getReplayToCommentId());
      String dateString = getDateString();
      comment.setModifyDate(dateString);
      return dao.update(comment);
    }
  }

  public void deleteComment(String projectId, String topicId,
    String commentId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfComment> dao = conn.getDao(BcfComment.class);
      dao.delete(commentId);
    }
  }

  /* Viewpoints */

  public List<BcfViewpoint> getViewpoints(
    String projectId, String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.select(filter, asList("index"));
    }
  }

  public BcfViewpoint getViewpoint(
    String projectId, String topicId, String viewpointId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      return dao.select(viewpointId);
    }
  }

  public BcfViewpoint createViewpoint(
    String projectId, String topicId, BcfViewpoint viewpoint)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfTopic> topicDao = conn.getDao(BcfTopic.class);
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) return null;
      topic.incrementLastViewpointIndex();
      topicDao.update(topic);

      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      viewpoint.setId(UUID.randomUUID().toString());
      viewpoint.setTopicId(topicId);
      viewpoint.setIndex(topic.getLastViewpointIndex());

      return dao.insert(viewpoint);
    }
  }

  public void deleteViewpoint(
    String projectId, String topicId, String viewpointId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      dao.delete(viewpointId);
    }
  }

  public BcfSnapshot getViewpointSnapshot(
    String projectId, String topicId, String viewpointId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfViewpoint> dao = conn.getDao(BcfViewpoint.class);
      BcfViewpoint viewpoint = dao.select(viewpointId);
      if (viewpoint == null)
        throw new NotFoundException("Viewpoint not found");

      BcfSnapshot snapshot = viewpoint.getSnapshot();
      if (snapshot == null)
        throw new NotFoundException("Snapshot not found");

      return snapshot;
    }
  }

  public List<BcfDocumentReference> getDocumentReferences(
    String projectId, String topicId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      return dao.select(filter, null);
    }
  }

  public BcfDocumentReference createDocumentReference(
    String projectId, String topicId, BcfDocumentReference documentReference)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      validate(documentReference);
      documentReference.setTopicId(topicId);

      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);
      documentReference.setId(UUID.randomUUID().toString());
      return dao.insert(documentReference);
    }
  }

  public BcfDocumentReference updateDocumentReference(
    String projectId, String topicId, String documentReferenceId,
    BcfDocumentReference documentReference)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      validate(documentReference);
      documentReference.setTopicId(topicId);

      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);

      if (documentReference.getId() == null)
      {
        documentReference.setId(documentReferenceId);
        return dao.update(documentReference);
      }
      else if (documentReferenceId.equals(documentReference.getId()))
      {
        return dao.update(documentReference);
      }
      else
      {
        dao.delete(documentReferenceId);
        return dao.insert(documentReference);
      }
    }
  }

  public void deleteDocumentReference(
    String projectId, String topicId, String documentReferenceId)
  {
    try (DaoConnection conn = getDaoConnection())
    {
      Dao<BcfDocumentReference> dao = conn.getDao(BcfDocumentReference.class);
      dao.delete(documentReferenceId);
    }
  }


  /* internal methods */

  private void validate(BcfDocumentReference documentReference)
  {
    int refs = 0;
    if (!StringUtils.isBlank(documentReference.getDocumentGuid())) refs++;
    if (!StringUtils.isBlank(documentReference.getUrl())) refs++;

    if (refs == 2)
      throw new InvalidRequestException("Can not define both document_guid and url");

    if (refs == 0)
      throw new InvalidRequestException("Must define document_guid or url");
  }

  private DaoConnection getDaoConnection()
  {
    DaoConnectionFactory daoFactory =
      (DaoConnectionFactory)application.getProperties().get("bcfDao");
    if (daoFactory == null) throw new RuntimeException("bcfDAO not found");

    return daoFactory.getConnection();
  }

  private String getDateString()
  {
    Date now = new Date();
    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    return df.format(now);
  }
}
