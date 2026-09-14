export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export type Deck = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type Flashcard = {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  options?: string[] | null;
  correct_index?: number | null;
  source_excerpt: string | null;
  source_file_name: string | null;
  source_page: number | null;
  source_file_id?: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
};

export type SourceFile = {
  id: string;
  deck_id: string;
  user_id: string;
  file_name: string;
  content_hash: string;
  pages: number;
  char_count: number;
  extracted_text: string;
  created_at: string;
};

export type PendingFlashcard = {
  id: string;
  deck_id: string;
  source_file_id: string | null;
  question: string;
  answer: string;
  source_excerpt: string | null;
  source_file_name: string | null;
  source_page: number | null;
  created_at: string;
};

export type UserStats = {
  user_id: string;
  xp: number;
  streak_current: number;
  streak_best: number;
  last_study_date: string | null;
  updated_at: string;
};

export type ReviewRating = "again" | "hard" | "easy";

export type SourceImage = {
  id: string;
  deck_id: string;
  source_file_id: string;
  page: number | null;
  storage_path: string | null;
  public_url: string;
  width: number | null;
  height: number | null;
  label: string | null;
  label_hint: string | null;
  is_interactive?: boolean;
  created_at: string;
};

export type ImageHotspot = {
  id: string;
  source_image_id: string;
  deck_id: string;
  x_pct: number;
  y_pct: number;
  label_simple: string;
  label_technical: string | null;
  odontology_use: string | null;
  sort_order: number;
  created_at: string;
};

export type StudyPlan = {
  id: string;
  deck_id: string;
  title: string;
  summary: string | null;
  created_at: string;
};

export type StudyLesson = {
  id: string;
  plan_id: string;
  deck_id: string;
  sort_order: number;
  title: string;
  explanation_simple: string;
  technical_term: string | null;
  activity_prompt: string;
  activity_answer: string | null;
  practical_odontology: string;
  status: "pending" | "done";
  source_file_id?: string | null;
  topic_key?: string | null;
  outline_item_id?: string | null;
  created_at: string;
};

export type ContentOutlineItem = {
  id: string;
  deck_id: string;
  source_file_id: string;
  title: string;
  page: number | null;
  summary: string | null;
  sort_order: number;
  status: "pending" | "in_progress" | "done";
  created_at: string;
};

export type MentorConversation = {
  id: string;
  user_id: string;
  deck_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type MentorMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type GameSession = {
  id: string;
  user_id: string;
  deck_id: string;
  source_file_id: string | null;
  game_type: "memory" | "crossword";
  score: number;
  completed_at: string | null;
  created_at: string;
};
