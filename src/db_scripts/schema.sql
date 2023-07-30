-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION adaptableadmin;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP SEQUENCE public.game_id_seq;

CREATE SEQUENCE public.game_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.move_id_seq;

CREATE SEQUENCE public.move_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- public.game definition

-- Drop table

-- DROP TABLE public.game;

CREATE TABLE public.game (
	player_red int4 NULL,
	player_green int4 NULL,
	"start" timestamptz NULL,
	finish timestamptz NULL,
	id int4 NOT NULL GENERATED BY DEFAULT AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE),
	CONSTRAINT game_pk PRIMARY KEY (id)
);


-- public."move" definition

-- Drop table

-- DROP TABLE public."move";

CREATE TABLE public."move" (
	id int4 NOT NULL GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE),
	game_id int4 NOT NULL,
	col int4 NOT NULL,
	"row" int4 NOT NULL,
	color int4 NOT NULL,
	"timestamp" timestamptz NULL,
	CONSTRAINT move_game FOREIGN KEY (game_id) REFERENCES public.game(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- public.player definition

-- Drop table

-- DROP TABLE public.player;

CREATE TABLE public.player (
	id int4 NOT NULL GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE),
	"name" varchar NOT NULL,
	surname varchar NOT NULL,
	email varchar NOT NULL,
	external_id varchar NOT NULL,
	service varchar NOT NULL
);