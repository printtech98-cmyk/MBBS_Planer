export type TopicStatus = 'not_started' | 'in_progress' | 'completed';

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  exam_date: string | null;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  user_id: string;
  name: string;
  status: TopicStatus;
  completed_at: string | null;
  created_at: string;
}

export interface StudyPlanEntry {
  id: string;
  user_id: string;
  topic_id: string;
  planned_date: string;
  done: boolean;
}

export interface RevisionReminder {
  id: string;
  user_id: string;
  topic_id: string;
  due_date: string;
  completed: boolean;
}

export interface TopicWithSubject extends Topic {
  subjects?: Pick<Subject, 'id' | 'name' | 'exam_date'>;
}

export interface StudyPlanEntryWithTopic extends StudyPlanEntry {
  topics?: Pick<Topic, 'id' | 'name' | 'status'> & {
    subjects?: Pick<Subject, 'id' | 'name'>;
  };
}

export interface RevisionReminderWithTopic extends RevisionReminder {
  topics?: Pick<Topic, 'id' | 'name'> & {
    subjects?: Pick<Subject, 'id' | 'name'>;
  };
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subject_id: string | null;
  created_at: string;
  subjects?: { name: string } | null;
}

export interface NoteWithSubject extends Note {
  subject_name: string | null;
}
