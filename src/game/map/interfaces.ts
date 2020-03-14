export interface MapLayer {
  initialize(): Promise<void>;
  render(): void;
}
