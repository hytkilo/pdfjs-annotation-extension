import { Annotation, HighlightAnnotation, QuadPoint, StrikeOutAnnotation, UnderlineAnnotation } from 'pdfjs'
import { Decoder } from './decoder'
import Konva from 'konva'
import { SHAPE_GROUP_NAME } from '../const'
import { convertToRGB } from '../../utils/utils'
import { AnnotationType, IAnnotationStore, PdfjsAnnotationEditorType, PdfjsAnnotationType } from '../../const/definitions'
import { defaultOptions } from '../../const/default_options'

export class HighlightDecoder extends Decoder {
    constructor(options) {
        super(options)
    }

    /**
     * 创建高亮形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 高亮形状对象
     */
    private createHighlightShape(x: number, y: number, width: number, height: number, color: string): Konva.Rect {
        return new Konva.Rect({
            x,
            y,
            width,
            height,
            opacity: 0.5,
            fill: color
        })
    }

    /**
     * 创建下划线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 下划线形状对象
     */
    private createUnderlineShape(x: number, y: number, width: number, height: number, color: string): Konva.Rect {
        return new Konva.Rect({
            x,
            y: height + y - 1.5,
            width,
            stroke: color,
            strokeWidth: 0.5,
            hitStrokeWidth: 10,
            height: 0.5
        })
    }

    /**
     * 创建删除线形状。
     * @param x 形状的 X 坐标
     * @param y 形状的 Y 坐标
     * @param width 形状的宽度
     * @param height 形状的高度
     * @returns Konva.Rect 删除线形状对象
     */
    private createStrikeoutShape(x: number, y: number, width: number, height: number, color: string): Konva.Rect {
        return new Konva.Rect({
            x,
            y: y + height / 2,
            width,
            stroke: color,
            strokeWidth: 0.5,
            hitStrokeWidth: 10,
            height: 0.5
        })
    }

    public decodePdfAnnotation(annotation: HighlightAnnotation | StrikeOutAnnotation | UnderlineAnnotation, allAnnotations: Annotation[]) {
        let color = convertToRGB(annotation.color)
        debugger
        const typeMap: { [key: string]: AnnotationType } = {
            [PdfjsAnnotationType.HIGHLIGHT]: AnnotationType.HIGHLIGHT,
            [PdfjsAnnotationType.UNDERLINE]: AnnotationType.UNDERLINE,
            [PdfjsAnnotationType.STRIKEOUT]: AnnotationType.STRIKEOUT
        }

        const type = typeMap[annotation.annotationType] || AnnotationType.HIGHLIGHT // 默认类型为 HIGHLIGHT

        const ghostGroup = new Konva.Group({
            draggable: false,
            name: SHAPE_GROUP_NAME,
            id: annotation.id
        })

        if (annotation.subtype === 'High') {
            color = defaultOptions.setting.HIGH_COLOR
            annotation.titleObj = {
                dir: '',
                str: '高风险'
            }
        } else if (annotation.subtype === 'Normal') {
            color = defaultOptions.setting.NORMAL_COLOR
            annotation.titleObj = {
                dir: '',
                str: '中风险'
            }
        } else if (annotation.subtype === 'Low') {
            color = defaultOptions.setting.LOW_COLOR
            annotation.titleObj = {
                dir: '',
                str: '低风险'
            }
        }

        const createShape = (quadPoint: QuadPoint[]) => {
            const { x, y, width, height } = this.convertQuadPoints(quadPoint, annotation.pageViewer.viewport.scale, annotation.pageViewer.viewport.height)
            switch (annotation.annotationType) {
                case PdfjsAnnotationType.HIGHLIGHT:
                    return this.createHighlightShape(x, y, width, height, color)
                case PdfjsAnnotationType.UNDERLINE:
                    return this.createUnderlineShape(x, y, width, height, color)
                case PdfjsAnnotationType.STRIKEOUT:
                    return this.createStrikeoutShape(x, y, width, height, color)
                default:
                    return null
            }
        }

        if (annotation.titleObj.str === 'High风险') {
            color = defaultOptions.setting.HIGH_COLOR
            annotation.titleObj.str = '高风险'
            annotation.subtype = 'High'
        } else if (annotation.titleObj.str === 'Normal风险') {
            color = defaultOptions.setting.NORMAL_COLOR
            annotation.titleObj.str = '中风险'
            annotation.subtype = 'Normal'
        } else if (annotation.titleObj.str === 'Low风险') {
            color = defaultOptions.setting.LOW_COLOR
            annotation.titleObj.str = '低风险'
            annotation.subtype = 'Low'
        } else if (annotation.titleObj.str === 'High建议') {
            color = defaultOptions.setting.HIGH_ADVICE_COLOR
            annotation.titleObj.str = '建议（高）'
            annotation.subtype = 'HighAdvice'
        } else if (annotation.titleObj.str === 'Normal建议') {
            color = defaultOptions.setting.NORMAL_ADVICE_COLOR
            annotation.titleObj.str = '建议（中）'
            annotation.subtype = 'NormalAdvice'
        } else if (annotation.titleObj.str === 'Low建议') {
            color = defaultOptions.setting.LOW_ADVICE_COLOR
            annotation.titleObj.str = '建议（低）'
            annotation.subtype = 'LowAdvice'
        }

        annotation.quadPoints?.forEach(quadPoint => {
            const shape = createShape(quadPoint)
            if (shape) {
                ghostGroup.add(shape)
            }
        })

        const annotationStore: IAnnotationStore = {
            id: annotation.id,
            pageNumber: annotation.pageNumber,
            pageRanges: null,
            konvaString: ghostGroup.toJSON(),
            konvaClientRect: ghostGroup.getClientRect(),
            title: annotation.titleObj.str,
            type,
            color,
            pdfjsType: annotation.annotationType,
            pdfjsEditorType: PdfjsAnnotationEditorType.INK,
            subtype: annotation.subtype,
            date: annotation.modificationDate,
            contentsObj: {
                text: annotation.contentsObj.str
            },
            comments: this.getComments(annotation, allAnnotations),
            readonly: true
        }

        ghostGroup.destroy()
        return annotationStore
    }
}
