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
package org.bimrocket.service.bcf;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.spi.CDI;
import jakarta.inject.Inject;
import java.util.Collections;
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
import org.bimrocket.exception.InvalidRequestException;
import org.bimrocket.exception.NotFoundException;
import org.bimrocket.odata.SimpleODataParser;
import org.bimrocket.service.mail.MailService;
import java.util.logging.Logger;
import org.apache.commons.text.StringSubstitutor;
import static java.util.Arrays.asList;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;
import org.bimrocket.service.bcf.store.BcfDaoConnection;
import org.bimrocket.service.bcf.store.BcfDaoStore;
import org.bimrocket.service.bcf.store.empty.BcfEmptyDaoStore;
import org.bimrocket.service.security.SecurityService;
import static org.bimrocket.util.TextUtils.getISODate;
import org.eclipse.microprofile.config.Config;


/**
 *
 * @author realor
 */
@ApplicationScoped
public class BcfService
{
  static final Logger LOGGER =
    Logger.getLogger(BcfService.class.getName());

  static final String BASE = "services.bcf.";

  static final Map<String, String> topicFieldMap = new ConcurrentHashMap<>();

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
  Config config;

  @Inject
  MailService mailService;

  @Inject
  SecurityService securityService;

  BcfDaoStore daoStore;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init BcfService");

    CDI<Object> cdi = CDI.current();

    try
    {
      @SuppressWarnings("unchecked")
      Class<BcfDaoStore> storeClass =
        config.getValue(BASE + "store.class", Class.class);
      daoStore = cdi.select(storeClass).get();
    }
    catch (Exception ex)
    {
      LOGGER.log(Level.SEVERE, "Invalid BcfDaoStore: {0}",
        config.getOptionalValue(BASE + "store.class", String.class).orElse(null));
      daoStore = new BcfEmptyDaoStore();
    }
    LOGGER.log(Level.INFO, "BcfDaoStore: {0}", daoStore.getClass());
  }

  @PreDestroy
  public void destroy()
  {
    LOGGER.log(Level.INFO, "Destroying BcfService");
    daoStore.close();
  }

  /* Projects */

  public List<BcfProject> getProjects()
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> dao = conn.getProjectDao();
      return dao.select(Collections.emptyMap(), asList("name"));
    }
  }

  public BcfProject getProject(String projectId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> dao = conn.getProjectDao();
      return dao.select(projectId);
    }
  }

  public BcfProject updateProject(
    String projectId, BcfProject projectUpdate)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> dao = conn.getProjectDao();
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
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> dao = conn.getExtensionsDao();
      BcfExtensions extensions = dao.select(projectId);
      if (extensions == null)
      {
        Optional<String> projectTemplateId =
          config.getOptionalValue(BASE + "projectTemplateId", String.class);

        if (projectTemplateId.isPresent())
        {
          extensions = dao.select(projectTemplateId.get());
        }
        if (extensions == null)
        {
          extensions = new BcfExtensions();
          extensions.setDefaultValues();
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
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
      BcfProject project = projectDao.select(projectId);
      if (project == null)
      {
        project = new BcfProject();
        project.setName("Project " + projectId);
        project.setId(projectId);
        projectDao.insert(project);
      }

      Dao<BcfExtensions> dao = conn.getExtensionsDao();
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
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> dao = conn.getTopicDao();
      SimpleODataParser parser = new SimpleODataParser(topicFieldMap);
      Map<String, Object> filter = parser.parseFilter(odataFilter);
      filter.put("projectId", projectId);
      List<String> orderBy = parser.parseOrderBy(odataOrderBy);
      return dao.select(filter, orderBy);
    }
  }

  public BcfTopic getTopic(String projectId, String topicId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> dao = conn.getTopicDao();
      return dao.select(topicId);
    }
  }

  public BcfTopic createTopic(String projectId, BcfTopic topic)
  {
    String userId = securityService.getCurrentUser().getId();
    topic.setCreationAuthor(userId);
    topic.setModifyAuthor(userId);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfProject> projectDao = conn.getProjectDao();
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

      Dao<BcfTopic> dao = conn.getTopicDao();
      topic.setId(UUID.randomUUID().toString());
      topic.setProjectId(projectId);
      String dateString = getISODate();

      topic.setCreationDate(dateString);
      topic.setModifyDate(dateString);
      topic.setIndex(project.getLastTopicIndex());
      topic = dao.insert(topic);

      String assignedTo = topic.getAssignedTo();

      if (mailService.isEnabled() && assignedTo != null
          && assignedTo.contains("@"))
      {
        Map<String, String> vars = new HashMap<>();
        vars.put("project.name", project.getName());
        vars.put("project.id", project.getId());
        vars.put("index", String.valueOf(topic.getIndex()));
        vars.put("id", topic.getId());
        vars.put("title", topic.getTitle());
        vars.put("priority", topic.getPriority());
        vars.put("description", topic.getDescription());

        String mailSubjectPattern =
          config.getValue(BASE + "mail.createTopic.subject", String.class);

        String mailBodyPattern =
          config.getValue(BASE + "mail.createTopic.body", String.class);

        StringSubstitutor substitutor = new StringSubstitutor(vars, "#{", "}");
        String subject = substitutor.replace(mailSubjectPattern);
        String message = substitutor.replace(mailBodyPattern);

        mailService.asyncSendMail(null, topic.getAssignedTo(), subject,
          message, null);
      }
      return topic;
    }
  }

  public BcfTopic updateTopic(String projectId, String topicId,
    BcfTopic topicUpdate)
  {
    String username = securityService.getCurrentUser().getId();
    topicUpdate.setModifyAuthor(username);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> dao = conn.getTopicDao();
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
      String dateString = getISODate();
      topic.setModifyDate(dateString);
      topic.setModifyAuthor(topicUpdate.getModifyAuthor());
      return dao.update(topic);
    }
  }

  public void deleteTopic(String projectId, String topicId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> dao = conn.getTopicDao();
      dao.delete(topicId);

      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      Dao<BcfComment> commentDao = conn.getCommentDao();
      commentDao.delete(filter);

      Dao<BcfViewpoint> viewpointDao = conn.getViewpointDao();
      viewpointDao.delete(filter);
    }
  }

  /* Comments */

  public List<BcfComment> getComments(String projectId, String topicId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> dao = conn.getCommentDao();
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.select(filter, asList("date"));
    }
  }

  public BcfComment getComment(String projectId, String topicId,
    String commentId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> dao = conn.getCommentDao();
      return dao.select(commentId);
    }
  }

  public BcfComment createComment(String projectId, String topicId,
    BcfComment comment)
  {
    String username = securityService.getCurrentUser().getId();
    comment.setAuthor(username);
    comment.setModifyAuthor(username);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> dao = conn.getCommentDao();
      comment.setId(UUID.randomUUID().toString());
      comment.setTopicId(topicId);
      String dateString = getISODate();
      comment.setDate(dateString);
      comment.setModifyDate(dateString);
      return dao.insert(comment);
    }
  }

  public BcfComment updateComment(String projectId, String topicId,
    String commentId, BcfComment commentUpdate)
  {
    String username = securityService.getCurrentUser().getId();
    commentUpdate.setModifyAuthor(username);

    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> dao = conn.getCommentDao();
      BcfComment comment = dao.select(commentId);
      if (comment == null) throw new RuntimeException("Comment not found");

      comment.setComment(commentUpdate.getComment());
      comment.setViewpointId(commentUpdate.getViewpointId());
      comment.setReplayToCommentId(comment.getReplayToCommentId());
      String dateString = getISODate();
      comment.setModifyDate(dateString);
      return dao.update(comment);
    }
  }

  public void deleteComment(String projectId, String topicId,
    String commentId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfComment> dao = conn.getCommentDao();
      dao.delete(commentId);
    }
  }

  /* Viewpoints */

  public List<BcfViewpoint> getViewpoints(
    String projectId, String topicId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> dao = conn.getViewpointDao();
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);
      return dao.select(filter, asList("index"));
    }
  }

  public BcfViewpoint getViewpoint(
    String projectId, String topicId, String viewpointId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> dao = conn.getViewpointDao();
      return dao.select(viewpointId);
    }
  }

  public BcfViewpoint createViewpoint(
    String projectId, String topicId, BcfViewpoint viewpoint)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfTopic> topicDao = conn.getTopicDao();
      BcfTopic topic = topicDao.select(topicId);
      if (topic == null) return null;
      topic.incrementLastViewpointIndex();
      topicDao.update(topic);

      Dao<BcfViewpoint> dao = conn.getViewpointDao();
      viewpoint.setId(UUID.randomUUID().toString());
      viewpoint.setTopicId(topicId);
      viewpoint.setIndex(topic.getLastViewpointIndex());

      return dao.insert(viewpoint);
    }
  }

  public void deleteViewpoint(
    String projectId, String topicId, String viewpointId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> dao = conn.getViewpointDao();
      dao.delete(viewpointId);
    }
  }

  public BcfSnapshot getViewpointSnapshot(
    String projectId, String topicId, String viewpointId)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfViewpoint> dao = conn.getViewpointDao();
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
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfDocumentReference> dao = conn.getDocumentReferenceDao();
      Map<String, Object> filter = new HashMap<>();
      filter.put("topicId", topicId);

      return dao.select(filter, null);
    }
  }

  public BcfDocumentReference createDocumentReference(
    String projectId, String topicId, BcfDocumentReference documentReference)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      validate(documentReference);
      documentReference.setTopicId(topicId);

      Dao<BcfDocumentReference> dao = conn.getDocumentReferenceDao();
      documentReference.setId(UUID.randomUUID().toString());
      return dao.insert(documentReference);
    }
  }

  public BcfDocumentReference updateDocumentReference(
    String projectId, String topicId, String documentReferenceId,
    BcfDocumentReference documentReference)
  {
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      validate(documentReference);
      documentReference.setTopicId(topicId);

      Dao<BcfDocumentReference> dao = conn.getDocumentReferenceDao();

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
    try (BcfDaoConnection conn = daoStore.getConnection())
    {
      Dao<BcfDocumentReference> dao = conn.getDocumentReferenceDao();
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
}
