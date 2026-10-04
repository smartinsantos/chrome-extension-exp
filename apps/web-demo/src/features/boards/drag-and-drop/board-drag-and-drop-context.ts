import { createContext, useContext } from 'react';

/** Identifies one rendered board, so drags stay inside the board they started in. */
export const BoardInstanceContext = createContext<symbol | undefined>(undefined);

export function useBoardInstanceId(): symbol {
  const boardInstanceId = useContext(BoardInstanceContext);
  if (boardInstanceId === undefined) {
    throw new Error('Card drag and drop must be rendered inside <BoardInstanceContext>.');
  }
  return boardInstanceId;
}
