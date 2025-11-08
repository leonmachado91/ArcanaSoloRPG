-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.arcana_cards (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  deck text NOT NULL,
  content text NOT NULL,
  CONSTRAINT arcana_cards_pkey PRIMARY KEY (id)
);
CREATE TABLE public.campaign_lore (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  category text NOT NULL,
  content text,
  embedding USER-DEFINED,
  CONSTRAINT campaign_lore_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_lore_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_played_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active'::text,
  genre text,
  world_adjective text,
  location text,
  era text,
  declarations ARRAY,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id)
);
CREATE TABLE public.characters (
  entity_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  history text,
  secret text,
  objective text,
  image_url text,
  character_type text NOT NULL,
  progress_points integer DEFAULT 0,
  unspent_element_points integer DEFAULT 0,
  elements jsonb,
  sheet_embedding USER-DEFINED,
  age integer,
  archetype text,
  personality_traits ARRAY,
  behavior_prompt text,
  CONSTRAINT characters_pkey PRIMARY KEY (entity_id),
  CONSTRAINT characters_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id)
);
CREATE TABLE public.chat_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  scene_id uuid NOT NULL,
  author_entity_id uuid,
  message_type text NOT NULL,
  content text,
  metadata jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT chat_history_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id),
  CONSTRAINT chat_history_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id),
  CONSTRAINT chat_history_author_entity_id_fkey FOREIGN KEY (author_entity_id) REFERENCES public.entities(id)
);
CREATE TABLE public.conditions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  level_1_description text,
  level_2_description text,
  level_3_description text,
  type text,
  nature text,
  embedding USER-DEFINED,
  CONSTRAINT conditions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.entities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  type text NOT NULL,
  CONSTRAINT entities_pkey PRIMARY KEY (id),
  CONSTRAINT entities_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.entity_conditions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  condition_id bigint NOT NULL,
  intensity text NOT NULL,
  remaining_turns integer,
  source_turn integer,
  source_description text,
  CONSTRAINT entity_conditions_pkey PRIMARY KEY (id),
  CONSTRAINT entity_conditions_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id),
  CONSTRAINT entity_conditions_condition_id_fkey FOREIGN KEY (condition_id) REFERENCES public.conditions(id)
);
CREATE TABLE public.entity_inventory (
  entity_id uuid NOT NULL,
  item_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  configuration_details jsonb,
  CONSTRAINT entity_inventory_pkey PRIMARY KEY (entity_id, item_id),
  CONSTRAINT entity_inventory_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id),
  CONSTRAINT entity_inventory_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id)
);
CREATE TABLE public.entity_traits (
  entity_id uuid NOT NULL,
  trait_id bigint NOT NULL,
  is_advantage boolean NOT NULL,
  CONSTRAINT entity_traits_pkey PRIMARY KEY (entity_id, trait_id),
  CONSTRAINT entity_traits_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id),
  CONSTRAINT entity_traits_trait_id_fkey FOREIGN KEY (trait_id) REFERENCES public.traits(id)
);
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  embedding USER-DEFINED,
  campaign_id uuid,
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  history text,
  relevant_info text,
  embedding USER-DEFINED,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.prompts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  key text NOT NULL UNIQUE,
  content text NOT NULL,
  description text,
  CONSTRAINT prompts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quest_entities (
  quest_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  role text NOT NULL,
  CONSTRAINT quest_entities_pkey PRIMARY KEY (quest_id, entity_id),
  CONSTRAINT quest_entities_quest_id_fkey FOREIGN KEY (quest_id) REFERENCES public.quests(id),
  CONSTRAINT quest_entities_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id)
);
CREATE TABLE public.quests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'available'::text,
  embedding USER-DEFINED,
  CONSTRAINT quests_pkey PRIMARY KEY (id),
  CONSTRAINT quests_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  topic text UNIQUE,
  content text,
  embedding USER-DEFINED,
  CONSTRAINT rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.scene_entities (
  scene_id uuid NOT NULL,
  entity_id uuid NOT NULL,
  CONSTRAINT scene_entities_pkey PRIMARY KEY (scene_id, entity_id),
  CONSTRAINT scene_entities_scene_id_fkey FOREIGN KEY (scene_id) REFERENCES public.scenes(id),
  CONSTRAINT scene_entities_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id)
);
CREATE TABLE public.scenes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  scene_number integer NOT NULL,
  description text,
  arcana_cards_drawn jsonb,
  is_active boolean NOT NULL DEFAULT false,
  turn_count integer NOT NULL DEFAULT 0,
  embedding USER-DEFINED,
  title text,
  CONSTRAINT scenes_pkey PRIMARY KEY (id),
  CONSTRAINT scenes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id)
);
CREATE TABLE public.traits (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  element text NOT NULL,
  description text,
  type text NOT NULL,
  embedding USER-DEFINED,
  CONSTRAINT traits_pkey PRIMARY KEY (id)
);