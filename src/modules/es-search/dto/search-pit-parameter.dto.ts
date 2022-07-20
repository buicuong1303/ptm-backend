class Pit {
  id: string;
  keep_alive: string;
}

export class SearchPitParameter {
  from?: number;
  to?: number;
  pit?: Pit;
  sort?: [];
  searchValue: string;
}
