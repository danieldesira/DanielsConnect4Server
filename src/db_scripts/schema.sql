-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION adaptableadmin;

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
	NO CYCLE;-- public.game definition

-- Drop table

-- DROP TABLE public.game;

CREATE TABLE public.game (
	id int4 NOT NULL GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE),
	player_red varchar NULL,
	player_green varchar NULL,
	"start" timestamptz NOT NULL,
	finish timestamptz NULL,
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
	CONSTRAINT fk_move_game FOREIGN KEY (game_id) REFERENCES public.game(id) ON DELETE CASCADE ON UPDATE CASCADE
);