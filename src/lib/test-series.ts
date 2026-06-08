type TestSeriesDocumentLike = {
  title: string;
};

const answerKeyPattern = /\b(answer\s*key|answerkey|solutions?|key)\b/i;

export function isAnswerKeyDocument(document: TestSeriesDocumentLike) {
  return answerKeyPattern.test(document.title);
}

export function partitionTestSeriesDocuments<T extends TestSeriesDocumentLike>(documents: T[]) {
  return {
    series: documents.filter((document) => !isAnswerKeyDocument(document)),
    answerKeys: documents.filter((document) => isAnswerKeyDocument(document)),
  };
}