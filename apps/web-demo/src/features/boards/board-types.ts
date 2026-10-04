import type { BoardDetailQuery } from '../../gql/graphql';

export type BoardDetail = NonNullable<BoardDetailQuery['board']>;
export type BoardListDetail = BoardDetail['lists'][number];
export type BoardCardDetail = BoardListDetail['cards'][number];
export type BoardLabel = BoardDetail['labels'][number];
