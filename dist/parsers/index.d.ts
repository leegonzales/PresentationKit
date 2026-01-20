/**
 * PresentationKit Parsers
 *
 * This module provides parsers for presentation formats,
 * with Talk Track v5 as the primary format.
 */
export type { TalkTrackV5, Section, SlideDefinition, SlideContent, SemanticTag, SemanticTagType, BrandConfig, RawFrontmatter, ParseResult, } from './types.js';
export { parseTalkTrack, safeParseTalkTrack, extractFrontmatter, validateTalkTrack, stripSemanticTags, TalkTrackParseError, } from './talk-track.js';
export { validateSlug, validateSection, validateImagePath, validateHexColor, validateDate, validatePosition, findDuplicateSlugs, validateSectionObject, type ValidationResult, } from './validators.js';
//# sourceMappingURL=index.d.ts.map