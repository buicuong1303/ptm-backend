export interface EsSearchServiceInterface<T> {
  insertIndex(): Promise<T>;

  deleteIndex(indexData: T): Promise<T>;

  searchDoc(searchData: T): Promise<T>;

  searchScrollDoc(searchData: T): Promise<T>;

  scrollDoc(scrollData: T): Promise<T>;

  clearScroll(deleteSearchScrollData: T): Promise<T>;

  insertBulkDoc(bulkData: T): Promise<T>;

  insertDoc(insertData: T): Promise<T>;

  deleteDoc(deleteData: T): Promise<T>;

  updateDoc(updateData: T): Promise<T>;
}
