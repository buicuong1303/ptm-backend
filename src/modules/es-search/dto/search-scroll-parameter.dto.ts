class Scroll {
  scroll: string;
  scroll_id: string;
}

export class SearchScrollParameter {
  size?: number;
  scroll?: Scroll;
  searchValue?: string;
  filters: any;
}
